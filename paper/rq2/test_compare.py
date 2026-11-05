"""Synthetic comparator checks; these are not model-inference measurements."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('compare_runs.py')

def fixture_run():
    labels = [0, 1, 2, 0]  # special, two content positions, special
    return {'ok': True, 'model_sha256': 'a' * 64,
            'config': {'fixtures': [{'id': 'synthetic', 'real_positions_including_special': 4}]},
            'runs': [{'fixture_id': 'synthetic', 'repeat': 0, 'valid_shape': True,
                      'nonfinite_indices': [], 'dims': [1, 4, 9], 'logits': [0.0] * 36, 'argmax': labels}]}

class CompareTests(unittest.TestCase):
    def run_pair(self, left, right):
        with tempfile.TemporaryDirectory() as directory:
            a, b = [Path(directory) / x for x in ['a.json', 'b.json']]
            a.write_text(json.dumps(left)); b.write_text(json.dumps(right))
            return subprocess.run([sys.executable, str(SCRIPT), str(a), str(b)], capture_output=True, text=True)

    def test_content_denominator_and_delta(self):
        a = fixture_run(); b = copy.deepcopy(a)
        b['runs'][0]['argmax'] = [4, 1, 0, 5]  # differing special tokens must be excluded
        b['runs'][0]['logits'][9] = 0.5
        result = self.run_pair(a, b)
        self.assertEqual(result.returncode, 0)
        row = json.loads(result.stdout)['rows'][0]
        self.assertEqual((row['matching_content_tokens'], row['content_tokens']), (1, 2))
        self.assertEqual(row['max_abs_logit_delta'], 0.5)

    def test_reject_different_artifact(self):
        a = fixture_run(); b = copy.deepcopy(a); b['model_sha256'] = 'b' * 64
        self.assertEqual(self.run_pair(a, b).returncode, 2)

    def test_reject_missing_pair(self):
        a = fixture_run(); b = copy.deepcopy(a); b['runs'] = []
        self.assertEqual(self.run_pair(a, b).returncode, 2)

    def test_preserve_invalid_output(self):
        a = fixture_run(); b = copy.deepcopy(a); b['runs'][0]['nonfinite_indices'] = [9]
        result = self.run_pair(a, b)
        self.assertEqual(json.loads(result.stdout)['invalid_records'], 1)
        self.assertNotIn('content_tokens', json.loads(result.stdout)['rows'][0])

if __name__ == '__main__':
    unittest.main()
