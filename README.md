# PII airlock

Find personal data on the device, send the LLM placeholders, and restore the reply locally.

```text
in:   Please call Daniel Okafor back at +1 206 555 0143 about the refund for order 88412.
sent: Please call [PERSON_1] back at [PHONE_1] about the refund for order 88412.
```

One NER model, [dslim/distilbert-NER](https://huggingface.co/dslim/distilbert-NER), runs in the browser with ONNX Runtime Web and on Android with LiteRT (formerly TensorFlow Lite). Rule-based detectors with checksums (Luhn for cards, mod 97 for IBANs) and an optional local name list run next to it. Each personal value becomes a placeholder, and the mapping stays in a vault on the device.

## Measured

Chrome 155 on an Apple M4 Pro with its Metal GPU, ONNX Runtime Web 1.30, one 128-token ticket:

| Model | Backend | Per ticket | Same label as PyTorch |
|---|---|---|---|
| int8, 66 MB | WebAssembly, 4 threads | 58 ms | 98.2% |
| fp16, 131 MB | WebGPU | 15 ms | 99.9% |
| int8, 66 MB | WebGPU | 85 ms | **67.9%** (wrong labels, no error) |

On 40 synthetic tickets, all 44 person names are redacted. The worker runs a golden-input self-test at startup and refuses a backend that disagrees with PyTorch. Native and LiteRT numbers are in [`out/results.json`](out/results.json), browser runs in [`out/browser-results.json`](out/browser-results.json).

## Run it

```sh
npm install
npm test        # tokenizer parity with Python, detectors, placeholders, redaction scores
```

Export, quantize and check the models (Python 3.11):

```sh
python3.11 -m venv .venv && . .venv/bin/activate
pip install -r python/requirements.txt
python python/export_models.py   # ONNX fp32, fp16, int8 and LiteRT fp32, int8, with parity and latency
python python/reference.py       # tokenizer reference, labels, golden inputs and the pinned model hash
```

Benchmark in the browser (needs Chrome; set `CHROME` if it isn't in the default macOS location):

```sh
npm run serve   # serves with the cross-origin isolation headers that unlock threads
npm run bench   # in another terminal
```

On Android, load `out/airlock-ner.int8.tflite` with LiteRT's `Interpreter` and call `runSignature` with the inputs `args_0` (token IDs) and `args_1` (attention mask) and the output `output_0`.

## Layout

- `web/tokenizer.js`: BERT WordPiece with character offsets
- `web/airlock.js`: detectors, word-level spans, merging, placeholders and restore
- `web/worker.js`: ONNX Runtime Web in a worker, with a pinned model hash and the self-test
- `python/`: export, quantization and parity checks for both runtimes
- `data/sentences.txt`: 40 synthetic support tickets; every name and number in them is fictional

## Limits

Forty synthetic tickets is a smoke test, not a benchmark: evaluate on a labeled sample of your own data. Pseudonymized text is still personal data under the GDPR, and the airlock doesn't hide quasi-identifiers, attachments, or what a model can infer from context.

## License

[MIT](LICENSE). The model and its vocabulary ([`out/vocab.txt`](out/vocab.txt)) are Apache-2.0.
