# RQ2: attempted reproduction and reduction plan

**No confirmed runtime bug and no executed minimal reproducer yet.** A diagnostic harness and frozen exact input tensors are provided for the next network-enabled run. The written attempt below satisfies the alternative failure-account deliverable; the harness is scaffolding, not evidence that the failure reproduces.

## What was tried

1. Read the original export, reference, benchmark and worker code and every saved JSON at original commit 7a983f237eff1c9e453b99af564bf38f70364e43. Quantization uses quantize_dynamic with QInt8 weights; the actual model graph is untracked and absent, so operator membership, quantization axes and transforms cannot be inspected here.
2. Verified all 27 source blobs; five existing tests pass. Tokenizer parity is established only for the 40 saved tickets. Generated 40 exact padded tensor fixtures with parity assertions; they represent 866 eligible positions including special tokens and 786 content tokens.
3. Tried a workspace clone, a temporary clean clone, dependency installation and a targeted model search. Filesystem restrictions/DNS and absent model/dependencies prevent inference. `inventory.py out/airlock-ner.int8.onnx` exits with `Model unavailable`; no operator inventory was produced. The current host is M5 Pro/Chrome157, not the historical M4 Pro/Chrome155.
4. Read the [ORT 1.30.0 WebGPU resolver](https://github.com/microsoft/onnxruntime/blob/v1.30.0/js/web/lib/wasm/jsep/webgpu/op-resolve-rules.ts), blob bf38af48562cfe74aa028df9c64b5863f98870d9. DynamicQuantizeLinear and MatMulInteger are absent; DequantizeLinear and MatMulNBits are present. This source inspection is a **placement clue**, not a trace of the missing NER graph. Fusions and WASM fallback must be inspected.
5. Verified [issue 15796](https://github.com/microsoft/onnxruntime/issues/15796) is closed (May 2024). Its [uint8 comment](https://github.com/microsoft/onnxruntime/issues/15796#issuecomment-1535755280) dates to May 2023. Absence of WGSL 8-bit scalar types does not prohibit packed quantized arithmetic or establish the 1.30 cause.
6. Read official [DynamicQuantizeLinear](https://onnx.ai/onnx/operators/onnx__DynamicQuantizeLinear.html), [MatMulInteger](https://onnx.ai/onnx/operators/onnx__MatMulInteger.html), [quantization](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html), [provider](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html) and [profiling/options](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html) guidance. Read MatMulNBits schema at ORT v1.30.0, ContribOperators blob e92b02faa7f77e53e3ac8fada213785609df7088. Dynamic int8, static QDQ and weight-only packed low-bit kernels must not be conflated.

## Harness use

In a network-enabled clean clone with original model bytes and dependencies:

```sh
npm ci
node paper/rq2/prepare_inputs.mjs
python paper/rq2/inventory.py out/airlock-ner.int8.onnx > /tmp/int8-inventory.json
npm run serve
```

Open `http://127.0.0.1:8790/paper/rq2/?ep=wasm&optimization=disabled&limit=1&repeats=3`, press Run, save JSON and console logs. Repeat with `ep=webgpu`, then both providers with `optimization=all`. This is the first ticket, not a guaranteed failure-triggering ticket. Increase to `limit=40` to find candidates. Each run uses a fresh worker/session and records the exact tensors, model hash, runtime version if exposed, browser, adapter probe, full logits, shape/nonfinite checks, argmax, per-repeat timings including readback, errors, and native historical reference comparisons. CPU fallback is **not** ruled out by this harness: `placement_verified` deliberately remains false pending logs/traces.

For another precision, pass a same-origin `model` URL and its required `sha` parameter. The harness is currently specific to DistilBERT [1, seq, 9] float32 logits and int64 feeds; GLiNER needs a distinct adapter. Do not silently reinterpret fp16 output bytes as float32. It validates hashes and times out after 120 seconds. Debug/profiling is enabled, so its timings are diagnostic and not final performance numbers. Fixture comparison includes special tokens only for parity with the historical aggregates; compare_runs.py reports content-only agreement.

```sh
python3 paper/rq2/compare_runs.py /path/to/wasm.json /path/to/webgpu.json > /tmp/paired.json
```

The comparator refuses different model hashes, input tensors or missing fixture/repeat pairs. It reports invalid outputs separately and preserves all denominators. It is not a privacy leak scorer; RQ5 requires gold annotations and the outgoing payload.

## Hypothesis checklist and decisive next tests

| Hypothesis | Evidence so far | Test that distinguishes it |
|---|---|---|
| Input/tokenizer/label mismatch | original JS tokenizer agrees on saved smoke inputs, but original model manifest incomplete | exact frozen IDs/masks/labels, same model SHA across providers and native CPU |
| CPU fallback / partition transfer | resolver lacks the named integer operators; actual placement unknown | verbose partition logs, provider profile and GPU trace; compare isolated failing operator and partition boundaries |
| DynamicQuantizeLinear scale / zero point | plausible from export API, graph absent | expose scale/zero point/tensor and replay known real activations; all-zero/range/extreme and rounding boundary tests |
| MatMulInteger signedness or accumulation | plausible, not observed | u8×s8 and u8×u8 controls with scalar/vector zero points; exact int32 expected products in a small captured subgraph |
| fp16 accumulation / numerical sensitivity | fp16 model's historical score is high; not a causal control for integer graph | fp32 vs fp16 kernels with same intermediate inputs, margin/logit trajectories, earliest error and optional feature/fusion controls |
| Per-tensor/per-channel quantization | exporter defaults not locked; graph absent | inspect initializers/axes/scales; re-export controlled variants with matching calibration/input semantics |
| Runtime regression / graph transform | native/web mismatch exists in saved aggregates; no trace/version lock for native | original 1.30.0, adjacent available releases and current stable, same binary artifact; optimization disabled/all then pass-level reduction |
| Warmup or nondeterminism | no before/after raw logits saved | first inference and each early repeat, cold/warm sessions, same inputs and readback; do not discard first wrong answers |

Start with identical-artifact WASM and WebGPU. If only converted artifacts differ equally on both, prioritize conversion rather than provider blame. If optimizer disabled fixes it, preserve both graphs/settings. Use captured layer outputs to locate the first large divergence, following the localization principles of CRADLE/TapML/DiTOX. Extract a candidate subgraph and its real activation tensors, preserve signedness and scale constants, then minimize nodes/dimensions/input values while retaining a declared mismatch criterion. A hand-built failing integer operation is a useful new finding but is not the same failure unless it preserves the original causal chain.

## Upstream issue status

No issue filed and no runtime-bug claim established. `UPSTREAM_ISSUE_DRAFT.md` is a clearly marked, unfiled investigation template with measured fields left unfilled. Complete it only after independent reproduction and artifact/input/placement controls. Keep reproduction failures and negative tests in the run ledger.
