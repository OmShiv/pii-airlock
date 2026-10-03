"""Export one token-classification model to ONNX and LiteRT (TFLite), quantize
both, and check that every variant agrees with PyTorch.

Run from a Python 3.11 venv after: pip install -r python/requirements.txt
"""
import json
import time
from pathlib import Path

import numpy as np
import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

MODEL_ID = "dslim/distilbert-NER"
SEQ = 128
OUT = Path(__file__).resolve().parent.parent / "out"
OUT.mkdir(exist_ok=True)

tok = AutoTokenizer.from_pretrained(MODEL_ID)
hf = AutoModelForTokenClassification.from_pretrained(MODEL_ID).eval()
labels = [hf.config.id2label[i] for i in range(hf.config.num_labels)]


class Logits(torch.nn.Module):
    """Hugging Face returns an output object; exporters want plain tensors."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask).logits


model = Logits(hf).eval()

SENTENCES = [line for line in (Path(__file__).resolve().parent.parent / "data" / "sentences.txt").read_text().splitlines() if line.strip()]


def encode(text, pad=True):
    enc = tok(text, truncation=True, max_length=SEQ, padding="max_length" if pad else False, return_tensors="np")
    return enc["input_ids"].astype(np.int64), enc["attention_mask"].astype(np.int64)


def torch_logits(ids, mask):
    with torch.no_grad():
        return model(torch.from_numpy(ids), torch.from_numpy(mask)).numpy()


def agreement(run):
    """Share of real (non-padding) tokens whose argmax label matches PyTorch."""
    same = total = 0
    for text in SENTENCES:
        ids, mask = encode(text)
        ref = torch_logits(ids, mask).argmax(-1)
        got = run(ids, mask).argmax(-1)
        keep = mask.astype(bool)
        same += int((ref[keep] == got[keep]).sum())
        total += int(keep.sum())
    return same / total


def latency_ms(run, repeats=60):
    ids, mask = encode(SENTENCES[0])
    for _ in range(5):
        run(ids, mask)
    times = []
    for _ in range(repeats):
        t = time.perf_counter()
        run(ids, mask)
        times.append((time.perf_counter() - t) * 1000)
    return round(float(np.median(times)), 2)


results = {"model": MODEL_ID, "labels": labels, "sequence_length": SEQ, "variants": {}}

# ---- ONNX ---------------------------------------------------------------------
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic

ids, mask = encode(SENTENCES[0])
onnx_fp32 = OUT / "airlock-ner.onnx"
batch, seq = torch.export.Dim("batch"), torch.export.Dim("seq", max=512)
torch.onnx.export(
    model,
    (torch.from_numpy(ids), torch.from_numpy(mask)),
    onnx_fp32,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_shapes={"input_ids": {0: batch, 1: seq}, "attention_mask": {0: batch, 1: seq}},
    opset_version=18,
    dynamo=True,
    external_data=False,
)
onnx_int8 = OUT / "airlock-ner.int8.onnx"
quantize_dynamic(onnx_fp32, onnx_int8, weight_type=QuantType.QInt8)

# fp16 for WebGPU: half the download of fp32, and correct on the GPU.
import onnx
from onnxconverter_common import float16

onnx_fp16 = OUT / "airlock-ner.fp16.onnx"
onnx.save(float16.convert_float_to_float16(onnx.load(onnx_fp32), keep_io_types=True), onnx_fp16)
results["fp16_size_mb"] = round(onnx_fp16.stat().st_size / 1e6, 1)


def ort_runner(path, threads):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    session = ort.InferenceSession(str(path), opts, providers=["CPUExecutionProvider"])
    return lambda i, m: session.run(["logits"], {"input_ids": i, "attention_mask": m})[0]


for name, path in [("onnx-fp32", onnx_fp32), ("onnx-int8", onnx_int8)]:
    results["variants"][name] = {
        "size_mb": round(path.stat().st_size / 1e6, 1),
        "token_agreement_vs_pytorch": round(agreement(ort_runner(path, 1)), 4),
        "latency_ms_1_thread": latency_ms(ort_runner(path, 1)),
        "latency_ms_4_threads": latency_ms(ort_runner(path, 4)),
    }
    print(name, results["variants"][name], flush=True)

# ---- LiteRT (TFLite) ------------------------------------------------------------
import litert_torch
from ai_edge_litert.interpreter import Interpreter

tflite_fp32 = OUT / "airlock-ner.tflite"
edge = litert_torch.convert(model, (torch.from_numpy(ids), torch.from_numpy(mask)))
edge.export(str(tflite_fp32))

tflite_int8 = OUT / "airlock-ner.int8.tflite"
from ai_edge_quantizer import quantizer, recipe

qt = quantizer.Quantizer(str(tflite_fp32))
qt.load_quantization_recipe(recipe.dynamic_wi8_afp32())
qt.quantize().export_model(str(tflite_int8), overwrite=True)


def tflite_runner(path, threads):
    interp = Interpreter(model_path=str(path), num_threads=threads)
    runner = interp.get_signature_runner()
    names = list(interp.get_signature_list()["serving_default"]["inputs"])
    def run(i, m):
        feeds = dict(zip(names, (i, m)))
        out = runner(**feeds)
        return next(iter(out.values()))
    return run, names


for name, path in [("tflite-fp32", tflite_fp32), ("tflite-int8", tflite_int8)]:
    run1, names = tflite_runner(path, 1)
    run4, _ = tflite_runner(path, 4)
    results["variants"][name] = {
        "size_mb": round(path.stat().st_size / 1e6, 1),
        "input_names": names,
        "token_agreement_vs_pytorch": round(agreement(run1), 4),
        "latency_ms_1_thread": latency_ms(run1),
        "latency_ms_4_threads": latency_ms(run4),
    }
    print(name, results["variants"][name], flush=True)

results["pytorch_latency_ms"] = latency_ms(torch_logits)
results["sentences"] = len(SENTENCES)
(OUT / "results.json").write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
