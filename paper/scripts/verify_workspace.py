#!/usr/bin/env python3
"""Verify source identity and repeatable paper artifacts without model inference."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
snapshot = json.loads((ROOT / 'paper/provenance/source-snapshot.json').read_text())
for f in snapshot['files']:
    raw = (ROOT / f['path']).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if actual != f['sha']:
        raise SystemExit(f'Original source changed: {f["path"]}')

def stable_generated(command, paths):
    before = {p: (ROOT / p).read_bytes() for p in paths}
    subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    assert all((ROOT / p).read_bytes() == b for p, b in before.items()), f'Derived artifacts stale: {paths}'

stable_generated([sys.executable, 'paper/scripts/audit_existing.py'], ['paper/derived/existing-audit.json'])
stable_generated([sys.executable, 'paper/scripts/build_literature.py'], ['paper/references.bib', 'paper/LITERATURE.md'])
stable_generated(['node', 'paper/rq2/prepare_inputs.mjs'], ['paper/rq2/inputs.json'])
records = json.loads((ROOT / 'paper/sources/references.json').read_text())
bib = (ROOT / 'paper/references.bib').read_text()
assert set(re.findall(r'^@\w+\{([^,]+),', bib, re.M)) == {r['key'] for r in records}
assert len(records) == 39
assert bib.count('{') == bib.count('}')
for r in records:
    assert r['url'].startswith('https://')
    assert r['verified_on'] == '2026-11-04'

checks = [
    ['npm', 'test'],
    [sys.executable, '-m', 'unittest', 'discover', '-s', 'paper/rq2', '-p', 'test_*.py', '-v'],
    ['node', '--check', 'paper/rq2/worker.js'],
    ['node', '--check', 'paper/rq2/prepare_inputs.mjs'],
]
results = []
for command in checks:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    results.append({'command': command, 'exit_code': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr})
    assert result.returncode == 0, results[-1]
report = {'evidence_kind': 'workspace_validation_not_inference', 'original_blobs_verified': len(snapshot['files']),
          'source_commit': snapshot['commit'], 'bibtex_entries': len(records),
          'derived_artifacts_repeatable': True, 'fresh_inference_completed': False, 'checks': results}
output = ROOT / 'paper/runs/2026-11-04-reproduction/final-validation.json'
output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'checks'}, indent=2))
