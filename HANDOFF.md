# PII airlock paper handoff

Author: Om Shankar Tiwari, ORCID https://orcid.org/0009-0001-2247-0383. Working title: *Same Model, Different Answers: Silent Cross-Backend Divergence in In-Browser Inference, and Runtime Guards for On-Device PII Redaction.*

## Status

Updated 2026-11-04 America/Los_Angeles; UTC logs may show 2026-11-05.

**First-session documentation and analysis prepared. Fresh inference reproduction is blocked. No runtime bug or new leak-rate result is established.** Read AGENTS.md and paper/README.md before resuming. No completed benchmark or manuscript exists.

| Milestone | State / remote evidence |
|---|---|
| M0 — source recovery/rules/scaffold | remote main verified: 2523e0f72ab11bb56299239dfe01c45d0d49af19 |
| M1 — saved-output audit/reproduction attempt | remote main verified: 017d0e77018b29cee80e023e6d862787781b76eb; fresh inference not completed |
| M2 — 39-source literature/BibTeX/gap | remote main verified: f4e73ee3b38f54715483f2fa695079a69071eec2 |
| M3 — protocol/devices/RQ2 attempt/harness | remote main verified: 5358be6292624eb8fd347a04906616187ac63312 |
| M4 — venue audit/final validation/handoff | prepared; remote checkpoint pending |

## Findings to preserve

- Baseline 7a983f237eff1c9e453b99af564bf38f70364e43 on OmShiv/pii-airlock main. All 27 original tracked blobs remain unchanged and hash-verified. README, all application/test/Python code and every out/*.json were read.
- Saved percentages match user rounding. Forty tickets contain 866 non-padding positions including 80 special tokens, or 786 content tokens. Native int8/native fp32 recomputes to 855/866 or 775/786 content-only. Browser numerators are inferred from rounding, not recovered labels. No fresh difference/latency result exists.
- The startup self-test returns a score; the worker enforces no readiness/refusal state. Strict equality to fp32 goldens would reject the saved int8/WASM path too. README's refusal claim exceeds the code. Application code was not changed.
- Faulty WebGPU output lacks saved spans/payloads, so its leak rate is unmeasured. Saved 44/44 name coverage is a name-by-ticket incidence smoke check on WASM spans, not entity recall or GPU protection.
- ORT 1.30's WebGPU resolver lacks DynamicQuantizeLinear/MatMulInteger registrations; actual graph/placement is missing. Fallback, integer semantics, optimization and warmup remain hypotheses. No cause diagnosed; issue 15796's uint8 comment is historical.
- Broad novelty is unsupported: CRADLE, Guo, DiffChaser, CompD, TapML, DiTOX, PrecisionDiff, MPCDiff and GPU Canary overlap. GAP.md proposes the joint browser-backend/PII-leakage/readiness/runtime-guard study conditionally. PAPILLON also has NAACL 2025 publication; Wang TOSEM publisher date is Jan 21, 2025.
- IEEE Access is the recommended timing route, based on typical four–six-week publication, not guaranteed acceptance. Later backup ISSTA 2027: Jan 8/11 abstract/paper; Apr 20 initial and Jun 17 final decision. It is usable only if eligible before the deadline and free of overlapping review. No guaranteed early-March route was verified.

## Environment and blockers

The supplied workspace /Users/omshankar/dev/research/pii-airlock was empty; ~/dev/pii-airlock absent. This is a materialized source snapshot, **not a normal local Git checkout**. Shell DNS fails for GitHub/npm and workspace .git writes are prohibited. GitHub connector read/write works; milestones use Git trees/commits/ref updates with expected-head checks and remote readback. Never force-push on mismatch.

Original model binaries are untracked and not located under ~/dev. Python 3.11/ML dependencies unavailable; installed Python 3.14.6. npm ci fails ENOTFOUND. Re-exporting with unpinned dependencies/model revisions may change artifacts.

User reports historical M4 Pro, Pixel 10 Pro XL and iPhone 17 Pro Max. Current host independently reports M5 Pro/24 GB/20 GPU cores, Chrome 157.0.8103.39 and Node 26.5.1, different from historical M4/Chrome155. Intel/NVIDIA/AMD and a second Android GPU require access. No lab/service booked or verified. No serials/UUIDs/UDIDs retained.

## Validations

`python3 paper/scripts/verify_workspace.py`: 27/27 source hashes; repeatable audit/BibTeX/map/fixture artifacts; 39 BibTeX entries; 5/5 original tests; 4/4 synthetic comparator tests; worker/fixture JavaScript syntax. HTML module syntax separately checked. Inventory exits 2 (model missing), recorded in paper/runs/2026-11-04-reproduction/rq2-attempts.json. Browser/ML execution untested. Raw validation logs are in the same runs directory.

## Exact next work

1. Read paper/REPRODUCTION.md, GAP.md, PROTOCOL.md, DEVICES.md, rq2/README.md and VENUES.md. Recheck dates before route decisions; no submission authorized.
2. On a network-enabled machine, clean-clone the remote; run `npm ci` and `npm test`. Locate original bytes matching out/airlock-ner.int8.onnx.sha256. Use isolated Python 3.11 and record package versions. If originals are unavailable, label re-exports and pin revisions/settings. Original exporters overwrite out/, so use a disposable clone and preserve saved JSON first.
3. Run `node paper/rq2/prepare_inputs.mjs`, `python3 paper/rq2/inventory.py out/airlock-ner.int8.onnx > /tmp/int8-inventory.json`, and `npm run serve`.
4. Open `http://127.0.0.1:8790/paper/rq2/?ep=wasm&optimization=disabled&limit=1&repeats=3`, run and save JSON+console. Repeat WebGPU and optimization=all; extend limit=40 to find candidates. `python3 paper/rq2/compare_runs.py wasm.json webgpu.json` compares identical hashes/tensors and content positions.
5. Establish placement and first divergent tensors, then minimize. Complete the local issue template only after evidence establishes a runtime bug; do not file it.
6. Freeze dataset revisions/IDs, label crosswalks, calibration and guard thresholds before held-out runs. Execute staged devices, cold-start/guard arms, public-data Presidio evaluation and local-LLM restoration. No such benchmark has run yet.
7. Update this Status and commit each milestone. Full retrieved text is only in /private/tmp/pii-airlock-source-cache-20261104 and unnecessary for basic resumption; verification metadata are in paper/sources. Re-fetch primary texts for deeper review. Preserve ACKNOWLEDGMENTS.md and disclose AI-assisted methodology.

## Authorization

Research commits/pushes are authorized. No contact, issue filing, submission, remote LLM prompt, device spending or account creation is authorized. None occurred. The diagnostic is a local experiment tool, not a deployed privacy gate. No result or citation was fabricated to meet the date.
