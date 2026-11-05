# Research rules

Read `HANDOFF.md` (especially Status), `README.md`, then `paper/README.md` before resuming. This project is a paper about inference correctness and its privacy consequences, not novelty in placeholder proxies.

- Never invent measurements, denominators, citations, quotations, hardware ownership, venue dates, or successful execution. Distinguish saved historical outputs, recomputed analyses, fresh inference, hypotheses, and planned experiments.
- PyTorch agreement is not ground-truth accuracy. Separate same-artifact cross-backend effects from conversion/quantization loss. Special tokens and padding require explicit inclusion rules.
- Preserve original `out/` files. Put new raw runs, environment manifests, logs, analysis scripts and derived outputs under `paper/`. Every number or figure needs its source and generating script. Never silently overwrite a run.
- Pin model revisions, artifact/tokenizer/label hashes, calibration data, runtime/browser/OS/driver versions, seeds and export settings. Record unsupported cells and CPU fallback rather than counting them as GPU execution.
- Label hypotheses. Attribute a runtime bug only after controlling tokenizer/input parity, artifact identity, optimization and actual operator placement. Do not file upstream issues; draft locally.
- Guard success requires enforced send blocking, not a returned agreement score. Never equate a handful of startup inputs with a guarantee on future requests. Keep truncation, non-finite outputs, unknown placeholders and contextual inference in scope.
- Report numerators and denominators; document uncertainty, paired comparisons, failures and missing cells. Forty synthetic tickets remain a smoke test.
- Maintain `paper/ACKNOWLEDGMENTS.md` disclosing LLM assistance. Verify citation metadata and supporting passages against primary sources; keep verification records. No fabricated bibliographic fields for unavailable sources.
- Do not contact people, file issues, submit manuscripts, or send prompts to remote LLM services. The user separately authorized committing and pushing research artifacts to this repository after each milestone.
- After each milestone update HANDOFF Status, validations, blockers, exact next commands and remote commit receipt, then commit to the repository. Do not claim a push until the remote ref is read back.
- Preserve other work. Never force-push or replace a branch after a lease mismatch. Do not store credentials, private personal values or restricted datasets in Git.
- No subagents unless the user requests delegation. No device/cloud spending or account creation is authorized.

## Current environment constraint

The supplied workspace is `/Users/omshankar/dev/research/pii-airlock`; the requested `~/dev/pii-airlock` did not exist at session start. Shell DNS is blocked and workspace `.git` is read-only. The initial 27 tracked text blobs were read at a pinned commit through the GitHub connector and verified with Git blob SHA-1. Use connector Git tree/commit/ref operations for remote milestones. A normal network-enabled clean clone is still required for full inference reproduction. Do not mistake this materialized source snapshot for a normal local Git checkout.
