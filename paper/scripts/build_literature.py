#!/usr/bin/env python3
"""Build BibTeX and the literature map from verified, curated metadata."""
import json
from pathlib import Path

PAPER = Path(__file__).resolve().parents[1]
records = json.loads((PAPER / 'sources/references.json').read_text())
assert 25 <= len(records) <= 40
assert len({r['key'] for r in records}) == len(records)
bib, rows = [], []
for i, r in enumerate(records, 1):
    assert all(r.get(k) for k in ['key', 'title', 'url', 'status', 'group', 'support', 'scope_limit', 'verified_on'])
    fields = {k: v for k, v in r.items() if k in {'title', 'author', 'year', 'booktitle', 'journal', 'volume', 'number', 'pages', 'doi', 'url', 'eprint', 'archivePrefix'}}
    fields['urldate'] = r['verified_on']
    fields['note'] = r['status']
    bib.append('@' + r.get('type', 'misc') + '{' + r['key'] + ',\n' + ',\n'.join('  ' + k + ' = {' + str(v) + '}' for k, v in fields.items()) + '\n}')
    rows.append(f"| {i} / `{r['key']}` | [{r['title']}]({r['url']}) | {r['status']} | {r['support']} | {r['scope_limit']} |")
(PAPER / 'references.bib').write_text('\n\n'.join(bib) + '\n')
header = f'''# Verified literature and technical-source map

{len(records)} unique curated sources, checked against primary pages on 2026-11-04. Search-result counts are retrieval workload, not a claim to have read that many full papers. See sources/retrieval-ledger.json for retrieval provenance and sources/references.json for exact fields and supporting URLs. BibTeX intentionally omits unverified bibliographic fields. Living documentation is cited with an access date rather than an invented publication year. Preprints, model cards and documentation are distinguished from peer-reviewed papers.

The gap is conditional and narrower than the initial framing; read GAP.md. The map includes general differential testing, deployment disagreement, browser-specific testing, prompt privacy, privacy data, models, specifications and runtime/operator semantics. It does not claim an exhaustive systematic review.

Corrections to the seed list: PAPILLON has a NAACL 2025 version (besides its 2024 preprint); the official BibTeX lists the first author as Siyan, Li. Wang et al. has a TOSEM publisher record dated 21 January 2025, DOI 10.1145/3688843, with arXiv identifier 2402.05981; the supplied July-2024 description is not used as the journal date. Guo et al. is an ASE 2019 proceedings paper even though the ACM page records online publication in February 2020. CompD's PMLR volume was published in 2024 for ACML 2023. Issue 15796 is closed and its uint8 comment dates to May 2023. None of these dates establishes current runtime support.

| ID / key | Verified primary source | Evidence type / publication | What it contributes | Limit for the proposed claim |
|---|---|---|---|---|
'''
(PAPER / 'LITERATURE.md').write_text(header + '\n'.join(rows) + '\n')
print(f'Built {len(records)} BibTeX entries and literature rows.')
