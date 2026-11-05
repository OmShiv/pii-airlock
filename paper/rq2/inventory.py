#!/usr/bin/env python3
"""Inspect an available ONNX graph. No claim about runtime operator placement."""
import argparse
import collections
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('model', type=Path)
args = parser.parse_args()
if not args.model.is_file():
    parser.exit(2, f'Model unavailable: {args.model}\n')
try:
    import onnx
except ImportError:
    parser.exit(2, 'onnx dependency unavailable; install in the isolated research environment\n')
model = onnx.load(args.model)
report = {
    'model_sha256': hashlib.sha256(args.model.read_bytes()).hexdigest(),
    'opsets': [{'domain': x.domain, 'version': x.version} for x in model.opset_import],
    'operator_counts': dict(collections.Counter(f'{n.domain or "ai.onnx"}::{n.op_type}' for n in model.graph.node)),
    'integer_initializers': [{'name': x.name, 'dtype': x.data_type, 'dims': list(x.dims)} for x in model.graph.initializer if x.data_type in (2, 3, 6, 7)],
    'nodes': [{'name': n.name, 'domain': n.domain, 'op': n.op_type, 'inputs': list(n.input), 'outputs': list(n.output),
               'attributes': {a.name: str(onnx.helper.get_attribute_value(a)) for a in n.attribute}} for n in model.graph.node],
    'placement_observed': False,
}
print(json.dumps(report, indent=2))
