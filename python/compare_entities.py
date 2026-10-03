"""Compare detected entity spans (not just token labels) across model variants."""
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from ai_edge_litert.interpreter import Interpreter
from transformers import AutoModelForTokenClassification, AutoTokenizer

MODEL_ID, SEQ = "dslim/distilbert-NER", 128
OUT = Path(__file__).resolve().parent.parent / "out"
tok = AutoTokenizer.from_pretrained(MODEL_ID)
hf = AutoModelForTokenClassification.from_pretrained(MODEL_ID).eval()
labels = [hf.config.id2label[i] for i in range(hf.config.num_labels)]
sentences = [l for l in (Path(__file__).resolve().parent.parent / "data" / "sentences.txt").read_text().splitlines() if l.strip()]


def spans(text, logits, offsets, mask):
    """BIO labels per token -> merged (type, start, end) character spans."""
    out, cur = [], None
    for (s, e), label_id, m in zip(offsets, logits.argmax(-1), mask):
        if not m or s == e:  # padding and [CLS]/[SEP]
            continue
        label = labels[label_id]
        kind = label[2:] if label != "O" else None
        if kind and (label.startswith("B-") and not (cur and cur[0] == kind and s == cur[2]) or not cur or cur[0] != kind):
            if cur:
                out.append(cur)
            cur = [kind, s, e]
        elif kind:
            cur[2] = e
        elif cur:
            out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return [(k, text[s:e]) for k, s, e in out]


ort_int8 = ort.InferenceSession(str(OUT / "airlock-ner.int8.onnx"), providers=["CPUExecutionProvider"])
lite = Interpreter(model_path=str(OUT / "airlock-ner.int8.tflite"))
lite_run = lite.get_signature_runner()

totals = {"pytorch": 0, "onnx-int8": 0, "tflite-int8": 0}
diffs = {"onnx-int8": [], "tflite-int8": []}
for text in sentences:
    enc = tok(text, truncation=True, max_length=SEQ, padding="max_length", return_offsets_mapping=True, return_tensors="np")
    ids, mask = enc["input_ids"].astype(np.int64), enc["attention_mask"].astype(np.int64)
    offsets, m = enc["offset_mapping"][0], mask[0]
    with torch.no_grad():
        ref = spans(text, hf(input_ids=torch.from_numpy(ids), attention_mask=torch.from_numpy(mask)).logits.numpy()[0], offsets, m)
    got = {
        "onnx-int8": spans(text, ort_int8.run(["logits"], {"input_ids": ids, "attention_mask": mask})[0][0], offsets, m),
        "tflite-int8": spans(text, next(iter(lite_run(args_0=ids, args_1=mask).values()))[0], offsets, m),
    }
    totals["pytorch"] += len(ref)
    for name, s in got.items():
        totals[name] += len(s)
        if s != ref:
            diffs[name].append({"text": text, "pytorch": ref, name: s})

print(json.dumps({"entities": totals, "sentences_that_differ": {k: len(v) for k, v in diffs.items()}}, indent=2, ensure_ascii=False))
for name, items in diffs.items():
    for d in items:
        print(f"\n[{name}] {d['text']}\n  pytorch: {d['pytorch']}\n  {name}: {d[name]}")
first = sentences[0]
enc = tok(first, return_offsets_mapping=True)
print("\nexample tokens:", tok.convert_ids_to_tokens(enc["input_ids"])[:16])
