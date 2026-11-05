#!/usr/bin/env python3
"""Compare complete diagnostic runs; reject artifact/input mismatches."""
import argparse
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('reference', type=Path)
parser.add_argument('candidate', type=Path)
args = parser.parse_args()
a, b = (json.loads(p.read_text()) for p in [args.reference, args.candidate])
if not a.get('ok') or not b.get('ok'):
    parser.exit(2, 'One or both diagnostics failed; report failure rather than agreement\n')
if a['model_sha256'] != b['model_sha256'] or a['config']['fixtures'] != b['config']['fixtures']:
    parser.exit(2, 'Artifact or exact fixture tensors differ; not a same-artifact comparison\n')
def indexed(run):
    rows = {(x['fixture_id'], x['repeat']): x for x in run['runs']}
    if len(rows) != len(run['runs']):
        parser.exit(2, 'Duplicate fixture/repeat key\n')
    return rows
left, right = indexed(a), indexed(b)
if left.keys() != right.keys():
    parser.exit(2, 'Missing fixture/repeat pairs; incomplete comparisons must be reported\n')
fixtures = {x['id']: x for x in a['config']['fixtures']}
rows = []
for key in sorted(left):
    x, y = left[key], right[key]
    row = {'fixture_id': key[0], 'repeat': key[1]}
    if not x['valid_shape'] or not y['valid_shape'] or x['nonfinite_indices'] or y['nonfinite_indices']:
        rows.append(row | {'valid': False, 'reason': 'shape/type/nonfinite output'})
        continue
    if x['dims'] != y['dims'] or len(x['logits']) != len(y['logits']):
        parser.exit(2, 'Output shapes differ\n')
    n = fixtures[key[0]]['real_positions_including_special']
    # These fixtures are fixed [CLS], content..., [SEP], padding.
    eligible = range(1, n - 1)
    diffs = [x['logits'][i*9+k] - y['logits'][i*9+k] for i in eligible for k in range(9)]
    refnorm = math.sqrt(sum(x['logits'][i*9+k] ** 2 for i in eligible for k in range(9)))
    rows.append(row | {'valid': True, 'matching_content_tokens': sum(x['argmax'][i] == y['argmax'][i] for i in eligible),
        'content_tokens': len(eligible), 'max_abs_logit_delta': max(map(abs, diffs), default=0),
        'relative_l2_delta': math.sqrt(sum(d*d for d in diffs)) / max(refnorm, 1e-12)})
print(json.dumps({'evidence_kind': 'paired_diagnostic_comparison', 'model_sha256': a['model_sha256'],
    'paired_records': len(rows), 'invalid_records': sum(not x['valid'] for x in rows), 'rows': rows}, indent=2))
