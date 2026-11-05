# Unfiled investigation template — not a confirmed bug report

Provisional title: Investigating int8 NER output disagreement between ORT Web providers

**Do not file in this state.** The author requested a local draft only. No fresh inference or minimal reproducer has completed in the current restricted environment.

Historical motivation: repository out/browser-results.json reports 0.6790 agreement with a native-fp32 reference for int8/WebGPU versus 0.9815 for int8/WASM on 40 synthetic tickets. The implied denominator from source and reference tensors is 866 positions including special tokens. These are saved aggregates, not new or independently reproduced runtime behavior. The file does not retain WebGPU labels, full environment information or operator placement. A bug attribution is premature.

Before filing, supply:

- Verified original/re-exported model distinction, SHA-256, model/ONNX license, opset and operator attributes.
- Minimal ONNX graph, exact serialized inputs, CPU/WASM/WebGPU outputs, full logits and mismatch criterion.
- Exact npm/wasm/JS build hashes, native runtime versions, browser build/flags, OS, GPU/driver and adapter features.
- Actual operator/partition placement, optimization level and cold/warm repeat evidence.
- Reproduction instructions starting from a clean environment and a bounded command that exits with a useful result.
- First known failing/passing versions if established, earliest divergent tensor, unsuccessful controls and any unsupported operators.

Expected behavior: supported execution should satisfy the documented operator semantics; unsupported execution should fail clearly. Cross-precision equality is not assumed. Establish the tolerable numerical error for this reduced operation and show the observed discrepancy before making a correctness assertion.

Observed fresh behavior: **unavailable**. Runtime cause: **unknown**. Reproduction attachments: **not yet generated**. No maintainer has been contacted.
