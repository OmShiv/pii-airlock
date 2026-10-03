"""Write reference tokens and ONNX Runtime (native) predictions for the JS checks."""
import hashlib, json
from pathlib import Path
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer, AutoConfig

MODEL_ID, SEQ = "dslim/distilbert-NER", 128
OUT = Path(__file__).resolve().parent.parent / "out"
tok = AutoTokenizer.from_pretrained(MODEL_ID)
cfg = AutoConfig.from_pretrained(MODEL_ID)
labels = [cfg.id2label[i] for i in range(cfg.num_labels)]
vocab = sorted(tok.get_vocab().items(), key=lambda kv: kv[1])
assert [i for _, i in vocab] == list(range(len(vocab)))
(OUT / "vocab.txt").write_text("\n".join(t for t, _ in vocab))
(OUT / "labels.json").write_text(json.dumps(labels))
session = ort.InferenceSession(str(OUT / "airlock-ner.int8.onnx"), providers=["CPUExecutionProvider"])
fp32 = ort.InferenceSession(str(OUT / "airlock-ner.onnx"), providers=["CPUExecutionProvider"])
sentences = [l for l in (Path(__file__).resolve().parent.parent / "data" / "sentences.txt").read_text().splitlines() if l.strip()]
ref = []
for text in sentences:
    enc = tok(text, truncation=True, max_length=SEQ, padding="max_length", return_offsets_mapping=True)
    ids = np.array([enc["input_ids"]], dtype=np.int64)
    mask = np.array([enc["attention_mask"]], dtype=np.int64)
    logits = session.run(["logits"], {"input_ids": ids, "attention_mask": mask})[0][0]
    logits32 = fp32.run(["logits"], {"input_ids": ids, "attention_mask": mask})[0][0]
    n = int(mask.sum())
    ref.append({"text": text, "ids": enc["input_ids"][:n], "pieces": [text[s:e] for s, e in enc["offset_mapping"][:n]], "argmax": logits.argmax(-1)[:n].tolist(), "argmax_fp32": logits32.argmax(-1)[:n].tolist()})
(OUT / "reference.json").write_text(json.dumps(ref, ensure_ascii=False))
print(len(ref), "sentences;", len(vocab), "vocab;", labels, "| lowercase:", getattr(tok, "do_lower_case", None))

# Golden inputs for the startup self-test: the first five tickets with the
# labels the fp32 model (identical to PyTorch here) produced.
goldens = [{"text": r["text"], "labels": r["argmax_fp32"]} for r in ref[:5]]
(OUT / "goldens.json").write_text(json.dumps(goldens, ensure_ascii=False))

# The hash the browser worker pins before it runs the int8 model.
digest = hashlib.sha256((OUT / "airlock-ner.int8.onnx").read_bytes()).hexdigest()
(OUT / "airlock-ner.int8.onnx.sha256").write_text(digest + "\n")
