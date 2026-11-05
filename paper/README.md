# Paper workspace

Author: **Om Shankar Tiwari**, ORCID [0009-0001-2247-0383](https://orcid.org/0009-0001-2247-0383). Working title: *Same Model, Different Answers: Silent Cross-Backend Divergence in In-Browser Inference, and Runtime Guards for On-Device PII Redaction.*

Read [HANDOFF](../HANDOFF.md) for status and [AGENTS](../AGENTS.md) for rules. This is a first-session research package, not a completed benchmark or manuscript.

| Deliverable | Artifact | Status |
|---|---|---|
| Clean-checkout reproduction | [Audit](REPRODUCTION.md), [derived counts](derived/existing-audit.json), [raw attempts](runs/2026-11-04-reproduction/) | **Fresh inference blocked**; source recovered and saved outputs audited |
| Verified sources and gap | [39-source map](LITERATURE.md), [BibTeX](references.bib), [metadata](sources/references.json), [gap](GAP.md) | complete bounded verification; no priority guarantee |
| Protocol and device list | [RQ1–RQ5](PROTOCOL.md), [device access](DEVICES.md) | planned; missing GPU access explicit |
| RQ2 reproduction or attempt account | [Account](rq2/README.md), [diagnostic](rq2/index.html), [unfiled template](rq2/UPSTREAM_ISSUE_DRAFT.md) | account complete; harness inference unexecuted, cause unknown |
| Official venue timing | [Venue table](VENUES.md) | IEEE Access timing route; ISSTA 2027 later backup with deadline/eligibility limits |

## Available checks

```sh
python3 paper/scripts/audit_existing.py
python3 paper/scripts/build_literature.py
node paper/rq2/prepare_inputs.mjs
python3 paper/scripts/verify_workspace.py
```

The final command verifies 27 original Git blob hashes, deterministic derived artifacts, 39 bibliography entries, five original Node tests, four synthetic comparator tests and diagnostic JavaScript syntax. It does **not** execute inference. The HTML script was separately syntax-checked during the RQ2 attempt. See the [validation log](runs/2026-11-04-reproduction/final-validation.json).

Original out/ and application code remain unchanged. The [source snapshot](provenance/source-snapshot.json) pins the baseline. New attempts go under runs/, analysis under scripts/, derived JSON under derived/. No benchmark figures have been generated. Every later figure must retain its script and raw measurements.

Source verification retains metadata, URLs, paraphrased findings and retrieval hashes; full copyrighted paper/page text is not redistributed. Public benchmark examples have not been downloaded or sent to a provider. Use source IDs/hashes and acquisition scripts where raw personal text should not enter Git.

See [ACKNOWLEDGMENTS](ACKNOWLEDGMENTS.md) for LLM disclosure and [milestone receipts](provenance/milestones.json). No contact, issue filing, manuscript submission, remote LLM experiment, lab booking or purchase occurred.
