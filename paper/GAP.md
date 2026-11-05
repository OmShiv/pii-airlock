# Gap assessment: conditional support for a narrower study

## Finding

The proposed broad claim is **not new**: cross-backend and cross-precision prediction disagreement, including safety consequences, is established. A defensible working gap is the **joint empirical study of same-artifact browser backend disagreement, its effect on outgoing PII, correctness-qualified startup, and enforceable runtime checks**. The searches did not identify a verified source combining all of those elements. That is a bounded search result, not proof of priority.

Thirty-nine primary research/technical sources are mapped in LITERATURE.md with BibTeX and evidence limits. Exa search calls requested 159 results across source discovery, closest-work checks, metadata verification and venue work; duplicates and irrelevant results are not additional verified sources. The search ran on 2026-11-04 and included deliberate counterexample queries about browser differential testing, runtime canaries and PII self-tests. Search provenance is in sources/retrieval-ledger.json. We inspected relevant abstracts, introductions and method excerpts, not every page of every paper. A final submission needs a fresh related-work search and full-text review of the closest papers.

## Closest overlap and what remains to show

| Prior work | Already establishes | Possible addition here |
|---|---|---|
| [CRADLE, ICSE 2019](https://dl.acm.org/doi/10.1109/ICSE.2019.00107) | cross-implementation disagreement and localization | browser deployment combinations and application-level privacy loss |
| [Guo et al., ASE 2019](https://dl.acm.org/doi/10.1109/ASE.2019.00080) | migration/quantization reliability across devices and browsers | controlled identical-artifact backend tests and PII-specific consequences |
| [DiffChaser, IJCAI 2019](https://www.ijcai.org/proceedings/2019/800), [CompD, PMLR 2024](https://proceedings.mlr.press/v222/li24b.html) | disagreement after compression, test generation and repair | backend-specific runtime behavior separated from ordinary conversion loss |
| [Ma et al., WWW 2019](https://dl.acm.org/doi/10.1145/3308558.3313639), [Wang et al., TOSEM](https://dl.acm.org/doi/10.1145/3688843) | browser performance, loading/warmup and QoE; Wang includes inference accuracy | time until a verified model is ready and agreement before/after warmup |
| [Quan et al., ASE 2022](https://dl.acm.org/doi/10.1145/3551349.3560427) | JavaScript DL fault taxonomy | privacy impact and detection coverage on real deployment faults |
| [TapML](https://arxiv.org/abs/2404.09151) | testing/debugging emerging platforms explicitly including WebGPU; operator test carving | runtime monitoring of a PII guard after deployment, on public privacy data |
| [DiTOX, CC 2026](https://doi.org/10.1145/3771775.3786265) | differential testing of ONNX optimizations | identify the actual browser execution partition/first divergent operator, if reproducible |
| [PrecisionDiff, 2026 preprint](https://arxiv.org/abs/2604.19790) | precision-induced safety-behavior changes | PII detection failures in a small on-device model and outgoing-prompt leakage |
| [MPCDiff, NDSS 2024](https://www.ndss-symposium.org/ndss-paper/mpcdiff-testing-and-repairing-mpc-hardened-deep-learning-models/) | correctness of privacy-preserving inference transformations | browser guard correctness with an explicit local-to-network boundary |
| [GPU Canary, October 2026 preprint](https://doi.org/10.5281/zenodo.23773926) | model-output probes for arithmetic-fault detection | compare startup, in-request and second-backend checks, including missed faults, interference and false refusals |
| [PAPILLON, NAACL 2025](https://aclanthology.org/2025.naacl-long.173/), [LLM-Redactor](https://arxiv.org/abs/2604.12064), [SurrogateShield](https://arxiv.org/abs/2606.29567), [PromptGraph](https://arxiv.org/abs/2607.10709) | prompt privacy pipelines, leakage/utility tradeoffs and restoration | diagnose whether a chosen local backend silently invalidates those protections |
| [Rampart whitepaper](https://inference.ndstudio.gov/rampart/whitepaper.pdf) | quantized in-browser PII model plus deterministic rules, public-data redaction evaluation and browser timings | backend correctness and guard effectiveness; basic architecture and leak scoring are closely overlapping |

It would be inaccurate to write that browser correctness is unstudied or that prior work measures only speed. It would also be inaccurate to claim the first runtime probe or first privacy-oriented differential test. The distinction must be demonstrated by the experiment, not by narrowing terminology after the fact.

## Proposed contribution statement

We study whether a fixed privacy-model artifact preserves its predictions across browser execution providers and whether deviations expose personal values in the outgoing prompt. We separate conversion loss from runtime divergence, characterize time until correctness checks pass under controlled cache and warmup states, and evaluate three deployable guard strategies against reproduced and injected faults. We report where each strategy misses faults or refuses otherwise usable requests, together with end-to-end redaction and restoration behavior.

This is a **proposed contribution**, not a statement of completed results. Backend agreement alone cannot establish PII accuracy; two backends can share the same error. [Staab et al.](https://proceedings.iclr.cc/paper_files/paper/2024/hash/9028b8a3ca98f58e373f0c1497a17448-Abstract-Conference.html) also show why explicit-value masking cannot establish protection from contextual inference.

## Hypotheses and falsification

- **H1:** Some supported same-artifact browser configurations silently disagree beyond measured repeat variation and ordinary reference conversion loss. Reject or narrow H1 if the historical effect cannot be reproduced or resolves to input/artifact mismatch.
- **H2:** Some disagreements increase gold PII values visible at the outgoing boundary. Reject the privacy-impact extension if disagreements affect only irrelevant labels or the rule layer masks every affected value.
- **H3:** Cold/warm state affects correctness for some configurations. This is exploratory; unchanged agreement is a useful negative result and must be reported.
- **H4:** Guards trade additional latency and false refusals for reductions in harmful silent acceptance. No universal detection guarantee is claimed; canary-specific faults and shared errors are expected counterexamples.

The current 40-ticket artifacts motivate H1; they do not establish H2, a runtime bug, any cross-device prevalence or guard effectiveness. A minimum publishable empirical case needs a fresh artifact-identical reproduction, public-data privacy measurements with denominators, operator/partition evidence or a rigorously bounded failure account, and honest guard false-negative/false-refusal results.
