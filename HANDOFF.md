# PII airlock paper handoff

Author: Om Shankar Tiwari, ORCID https://orcid.org/0009-0001-2247-0383. Working title: *Same Model, Different Answers: Silent Cross-Backend Divergence in In-Browser Inference, and Runtime Guards for On-Device PII Redaction.*

## Status

Updated 2026-11-04 America/Los_Angeles (tool timestamps may show 2026-11-05 UTC).

- M0: source recovery and research scaffolding prepared; remote milestone pending.
- Baseline pinned to `7a983f237eff1c9e453b99af564bf38f70364e43` on `OmShiv/pii-airlock`, main. All 27 tracked blobs recovered and verified byte-for-byte against Git blob hashes. README, Python export/reference/compare scripts, browser worker/benchmark/tokenizer/redactor, tests and every `out/*.json` inspected.
- Existing `npm test`: 5/5 pass on Node 26.5.1. These exercise tokenizer parity and saved spans, not fresh inference.
- Fresh inference reproduction blocked: model binaries intentionally untracked and absent; Python 3.11/ML dependencies absent; `npm ci` fails DNS for registry.npmjs.org; shell clone fails DNS for github.com; workspace forbids `.git` writes. GitHub connector read/write access works. No fresh accuracy or latency measurement yet.
- Important audit finding: `worker.js` computes and returns self-test agreement; it does not implement an enforced readiness/refusal state. `bench.html` reports self-tests separately after inference. README's claim that startup refuses a disagreeing backend is not established by this code.
- Literature verification, protocol, root-cause attempt and venue audit in progress. PrecisionDiff, DiffChaser and CompD broaden the overlap that the novelty statement must address.

## Resume

1. Read AGENTS.md and paper/README.md, then the milestone documents.
2. Preserve `out/` as historical evidence; write all new artifacts under paper/.
3. In this restricted environment, use the GitHub connector, check the current main ref, create a tree based on that head, commit, update with expected SHA, and read the head back. Never claim a shell push.
4. On a network-enabled machine: clean-clone the remote; install Python 3.11 and pinned dependencies into an isolated venv; export to a separate run directory and verify the original model hash before calling it the same artifact. Then run browser and native inference with raw per-token outputs.

## Milestones

| Milestone | Scope | State |
|---|---|---|
| M0 | source snapshot, rules, paper scaffold | prepared |
| M1 | existing-output audit and reproduction attempt | in progress |
| M2 | verified literature, BibTeX and gap | pending |
| M3 | experiment protocol and RQ2 reproduction account | pending |
| M4 | venue dates, verification and final handoff | pending |

## Decisions and limits

- Target accepted **and published** by early March 2027; acceptance alone or an arXiv preprint does not satisfy this.
- Full requested multi-GPU/device experiments are later work; this session delivers a protocol and an honest reproduction attempt.
- Apple M4 Pro ownership is user-reported. Other devices are unconfirmed; device question pending.
- No submission, upstream filing, contact or remote LLM call authorized.
