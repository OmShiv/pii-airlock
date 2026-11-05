# PII airlock paper handoff

Author: Om Shankar Tiwari, ORCID https://orcid.org/0009-0001-2247-0383. Working title: *Same Model, Different Answers: Silent Cross-Backend Divergence in In-Browser Inference, and Runtime Guards for On-Device PII Redaction.*

## Status

Updated 2026-11-04 America/Los_Angeles (tool timestamps may show 2026-11-05 UTC).

- M0 committed and remote main verified: `2523e0f72ab11bb56299239dfe01c45d0d49af19`. M1 audit complete; fresh inference remains blocked.
- Baseline pinned to `7a983f237eff1c9e453b99af564bf38f70364e43` on `OmShiv/pii-airlock`, main. All 27 tracked blobs recovered and verified byte-for-byte against Git blob hashes. README, Python export/reference/compare scripts, browser worker/benchmark/tokenizer/redactor, tests and every `out/*.json` inspected.
- Existing `npm test`: 5/5 pass on Node 26.5.1. These exercise tokenizer parity and saved spans, not fresh inference.
- Fresh inference reproduction blocked: model binaries intentionally untracked and absent; Python 3.11/ML dependencies absent; `npm ci` fails DNS for registry.npmjs.org; shell clone fails DNS for github.com; workspace forbids `.git` writes. GitHub connector read/write access works. No fresh accuracy or latency measurement yet.
- Important audit finding: `worker.js` computes and returns self-test agreement; it does not implement an enforced readiness/refusal state. `bench.html` reports self-tests separately after inference. README's claim that startup refuses a disagreeing backend is not established by this code.
- Literature map and BibTeX complete: 39 primary research/technical sources. GAP.md records substantial prior overlap (including TapML and GPU Canary) and a conditional privacy/backend/runtime-guard gap. Protocol, device access list and RQ2 written account/harness complete. Venue audit/final checks in progress.

## Resume

1. Read AGENTS.md and paper/README.md, then the milestone documents.
2. Preserve `out/` as historical evidence; write all new artifacts under paper/.
3. In this restricted environment, use the GitHub connector, check the current main ref, create a tree based on that head, commit, update with expected SHA, and read the head back. Never claim a shell push.
4. On a network-enabled machine: clean-clone the remote; install Python 3.11 and pinned dependencies into an isolated venv; export to a separate run directory and verify the original model hash before calling it the same artifact. Then run browser and native inference with raw per-token outputs.

## Milestones

| Milestone | Scope | State |
|---|---|---|
| M0 | source snapshot, rules, paper scaffold | remote verified 2523e0f |
| M1 | existing-output audit and reproduction attempt | complete account; no fresh inference |
| M2 | verified literature, BibTeX and gap | complete; 39 sources, conditional gap |
| M3 | experiment protocol and RQ2 reproduction account | complete protocol/account; harness inference unexecuted |
| M4 | venue dates, verification and final handoff | pending |

## Decisions and limits

- Target accepted **and published** by early March 2027; acceptance alone or an arXiv preprint does not satisfy this.
- Full requested multi-GPU/device experiments are later work; this session delivers a protocol and an honest reproduction attempt.
- User reports Apple M4 Pro, Pixel 10 Pro XL and iPhone 17 Pro Max. Current session host independently reports Apple M5 Pro / 24 GB / Chrome 157; do not conflate the two Mac configurations. Intel/NVIDIA/AMD and a second Android GPU remain access gaps.
- No submission, upstream filing, contact or remote LLM call authorized.

## M1 evidence

See paper/REPRODUCTION.md and paper/derived/existing-audit.json. Recomputed native int8/fp32 agreement: 855/866 including special tokens, 775/786 content-only. Browser aggregate counts are inferred from rounded rates, not recovered predictions. Existing figures match user rounding; a fresh-run difference is unavailable. Self-test only scores; strict fp32 equality would also reject the saved int8/WASM path.

## M2 evidence

M1 remote verified: `017d0e77018b29cee80e023e6d862787781b76eb`. `python3 paper/scripts/build_literature.py` regenerates 39 BibTeX entries and the literature map. Source metadata and hashes are retained; full retrieved text is held only in a temporary cache. PAPILLON is also NAACL 2025; Wang TOSEM publisher date is January 2025. Do not use the initial broad novelty claim.

## M3 evidence and next execution

M2 remote verified: `f4e73ee3b38f54715483f2fa695079a69071eec2`. Read paper/PROTOCOL.md, DEVICES.md and rq2/README.md. `node paper/rq2/prepare_inputs.mjs` verifies 40 fixtures; worker and HTML JavaScript parse. Four synthetic comparator tests pass; they do not validate browser inference. `python3 paper/rq2/inventory.py out/airlock-ner.int8.onnx` exits 2 because the model is absent. First live step after dependencies/model are available: `npm run serve`, open `/paper/rq2/?ep=wasm&optimization=disabled&limit=1&repeats=3`, then WebGPU and optimization=all, saving JSON and console. No issue filed; unfiled issue template is explicitly incomplete.
