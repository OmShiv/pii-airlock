# Reproduction audit, 2026-11-04

**Fresh inference was not reproduced.** The original source was recovered at commit `7a983f237eff1c9e453b99af564bf38f70364e43` and all 27 tracked blobs verified. Five existing Node tests pass. The analysis below recomputes what the saved files support, with no new model accuracy or latency claims.

## Existing numbers and denominators

Generate `derived/existing-audit.json` with `python3 paper/scripts/audit_existing.py`. Forty tickets contain **866 non-padding positions including 80 [CLS]/[SEP] tokens**, or **786 content tokens**. The original Python and browser benchmark both include special tokens in agreement. This differs from a content-token-only measure.

| Configuration | Saved agreement | User's rounded figure | Counts and evidence |
|---|---:|---:|---|
| Browser int8 WASM, 4 threads | 98.15% | 98.2% | 850/866 is the unique count consistent with saved rounding; browser labels were not saved |
| Browser fp16 WebGPU | 99.88% | 99.9% | 865/866 consistent with saved rounding, not recovered raw labels |
| Browser int8 WebGPU | 67.90% | 67.9% | 588/866 consistent with saved rounding, not recovered raw labels |
| Native int8 ONNX | 98.73% | 98.7% | **855/866 recomputed** from native int8 and native fp32 labels in reference.json; fp32-to-PyTorch equality is an aggregate assertion in results.json |
| Native int8 LiteRT | 99.42% | 99.4% | 861/866 consistent with saved rounding; LiteRT labels were not saved |

These saved figures agree with the user's rounded figures. **No live difference can be computed**, because no fresh inference completed. Content-only native int8 versus native fp32 agreement is **775/786 = 98.60%**, recomputed from stored labels. None of these is ground-truth PII accuracy.

The original browser latency medians are 57.72 ms (int8/WASM/4), 14.83 ms (fp16/WebGPU), and 84.80 ms (int8/WebGPU). These are historical aggregates over 30 retained runs on the first ticket, after 40 corpus requests plus five discarded timing runs. The per-run times are missing. They are not fresh measurements and do not establish cold-start behavior. Native timing uses five warmups and 60 retained calls. Different median conventions also occur: JS takes the upper middle observation; NumPy averages the middle pair.

## Reproduction attempts and current host

| Attempt | Observation | Consequence |
|---|---|---|
| Workspace inspection | supplied directory empty; ~/dev/pii-airlock absent | no existing local checkout or model artifacts |
| git clone in workspace | `.git: Operation not permitted` | local Git metadata unavailable under current profile |
| git clone to writable /private/tmp | `Could not resolve host: github.com` | normal clean checkout unavailable |
| Connector snapshot | 27/27 Git blob hashes match pinned source | clean source bytes recovered; this is not a normal Git checkout |
| npm test | 5/5 tests pass | validates tokenizer on 40 saved tickets, structured rules, saved redaction spans and a handcrafted placeholder round-trip |
| npm ci --ignore-scripts with isolated cache | `ENOTFOUND registry.npmjs.org` | runtime and Puppeteer unavailable |
| ML dependency probe | Python 3.14.6; no torch, numpy, onnx, onnxruntime, transformers or tensorflow; no Python 3.11 binary in /opt/homebrew/bin | export/native inference unavailable |
| Model artifact search under ~/dev | only out/airlock-ner.int8.onnx.sha256 | none of the required ONNX/TFLite binaries located |

Current host was observed as **Apple M5 Pro, 24 GB RAM, 20 GPU cores**, and installed **Chrome 157.0.8103.39**, Node 26.5.1. This is different from the historical, user-reported M4 Pro / Chrome 155. The stored browser user agent identifies Chrome 155 and Apple Metal but does not independently encode M4 Pro, exact OS, driver or build provenance. Serial numbers and hardware identifiers are deliberately excluded from artifacts.

Raw command results are in `runs/2026-11-04-reproduction/`. This environment can commit through GitHub connector Git operations. Source and dependency network constraints cannot be resolved by calling saved-output tests an inference run.

## Evidence problems that affect the paper

1. **Self-test is diagnostic, not enforced.** worker.js accepts `detect` after `init` without a successful self-test. selfTest returns a ratio. bench.html runs the corpus first and self-tests later. There is no send interceptor, readiness state or threshold enforcement here. README's refusal claim is therefore stronger than the implementation.
2. **Benign quantization disagrees with fp32 goldens.** Saved self-test aggregates on five tickets (129 positions including special tokens) are 72.09% for int8/WebGPU (consistent with 93/129), 95.35% for int8/WASM (123/129), and 100% for fp16/WebGPU (129/129). A strict fp32 equality gate would reject both int8 paths; the existing test does not demonstrate an acceptable false-refusal tradeoff.
3. **Leakage of the faulty GPU run is unmeasured.** Only int8/WASM/4 spans and redacted texts are saved. The 44/44 person-name test is name-by-ticket incidence coverage over these saved spans, not entity-span recall and not evidence of leakage or protection on int8/WebGPU. The default policy covers 18/27 company-by-ticket incidences, versus 27/27 with MISC enabled or a dictionary. Repeated mentions within one ticket are not independently counted.
4. **No operator attribution.** Requesting `webgpu` and observing a non-fallback adapter does not prove every model operator ran on GPU. Neither partition logs nor shader/kernel traces were saved. The int8 ONNX graph is absent, so DynamicQuantizeLinear/MatMulInteger involvement remains a hypothesis from export code, not an inspected graph result.
5. **Unpinned export environment.** requirements.txt and Hugging Face revisions are unpinned; reference.py uses native int8 and fp32 ONNX, not a separately saved PyTorch tensor trace. The browser int8 model is hash checked; fp32/fp16 hashes, tokenizer/label manifest and export/runtime package lock are missing. Re-exporting may produce a different artifact.
6. **Missing failure checking.** The benchmark does not check `r.ok` before reading labels; requests have no timeout. Model output finite values, shapes and lengths are not validated. Truncation is reported by the tokenizer but is not an enforced send refusal. These need independent fault categories.
7. **Android not established.** Python LiteRT timings lack device metadata and the repository contains instructions rather than an Android app/hardware run. Do not relabel them Android measurements.

## Exact next reproduction actions on a network-enabled host

```sh
git clone https://github.com/OmShiv/pii-airlock.git /tmp/pii-airlock-clean
cd /tmp/pii-airlock-clean
git rev-parse HEAD
npm ci
npm test
python3.11 -m venv .venv
. .venv/bin/activate
python -m pip install -r python/requirements.txt
python -m pip freeze > /tmp/pii-airlock-python-freeze.txt
```

First seek the **original** model bytes matching out/airlock-ner.int8.onnx.sha256. If unavailable, run the exporter in this disposable clone, retain logs, revisions and hashes, and label outputs **re-exported model**, not the original-artifact reproduction. Copy the original out/ JSON before running export_models.py/reference.py, as those scripts overwrite historical outputs. Run serve/bench to a new paper/runs directory, using the RQ2 harness for per-token/logit retention. Repeat once on the original M4/Chrome155/ORT1.30 if available, and once on current stable versions. Separate host drift from runtime drift. Export/native execution and browser correctness are still outstanding.
