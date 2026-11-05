#!/usr/bin/env python3
"""Recompute available counts; never describe aggregate-only data as a rerun."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out'
DEST = ROOT / 'paper/derived/existing-audit.json'

def read(name):
    return json.loads((OUT / name).read_text())

def possible_numerators(rate, denominator):
    # Original scripts round to four decimal places; uniqueness is inference.
    return [n for n in range(denominator + 1) if round(n / denominator, 4) == rate]

refs, browser, native, goldens = map(read, ['reference.json', 'browser-results.json', 'results.json', 'goldens.json'])
assert len(refs) == native['sentences'] == 40
assert all(len(r['ids']) == len(r['argmax']) == len(r['argmax_fp32']) == len(r['pieces']) for r in refs)
assert all(r['pieces'][0] == r['pieces'][-1] == '' for r in refs)
all_n = sum(len(r['ids']) for r in refs)
real_n = all_n - 2 * len(refs)
same = sum(a == b for r in refs for a, b in zip(r['argmax'], r['argmax_fp32']))
real_same = sum(a == b for r in refs for a, b in zip(r['argmax'][1:-1], r['argmax_fp32'][1:-1]))
gold_n = sum(len(r['labels']) for r in goldens)
report = {
    'evidence_kind': 'analysis_of_historical_outputs_not_fresh_inference',
    'tickets': len(refs), 'tokens_including_CLS_SEP_excluding_PAD': all_n,
    'content_tokens_excluding_CLS_SEP_PAD': real_n,
    'native_int8_vs_native_fp32_recomputed': {'same': same, 'total': all_n, 'agreement': same / all_n},
    'native_int8_vs_native_fp32_content_only': {'same': real_same, 'total': real_n, 'agreement': real_same / real_n},
    'browser_aggregate_only': [
        {k: v for k, v in r.items() if k != 'examples'} | {
            'denominator_from_source_loop_and_reference': all_n,
            'numerators_consistent_with_saved_rounded_rate_NOT_raw_counts': possible_numerators(r['agreementVsPytorchFp32'], all_n),
        } for r in browser['runs'] if 'error' not in r
    ],
    'startup_aggregate_only': [r | {'tickets': len(goldens), 'denominator_from_source': gold_n,
        'numerators_consistent_with_saved_rounded_rate_NOT_raw_counts': possible_numerators(r['agreement'], gold_n)} for r in browser['selfTest']],
    'native_aggregate_only': {k: v | {'denominator_from_source': all_n,
        'numerators_consistent_with_saved_rounded_rate_NOT_raw_counts': possible_numerators(v['token_agreement_vs_pytorch'], all_n)} for k, v in native['variants'].items()},
    'hashes_sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.glob('*')) if p.is_file()},
    'fresh_inference_completed': False,
}
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['tickets', 'tokens_including_CLS_SEP_excluding_PAD', 'content_tokens_excluding_CLS_SEP_PAD', 'native_int8_vs_native_fp32_recomputed', 'native_int8_vs_native_fp32_content_only']}, indent=2))
