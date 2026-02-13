import hashlib
import json
import time
from typing import Any, Dict

def generate_stamp(inputs: Dict[str, Any], outputs: Dict[str, Any]) -> Dict[str, Any]:
    # Canonicalize inputs and outputs for hashing
    input_str = json.dumps(inputs, sort_keys=True)
    output_str = json.dumps(outputs, sort_keys=True)

    input_hash = hashlib.sha256(input_str.encode()).hexdigest()
    output_hash = hashlib.sha256(output_str.encode()).hexdigest()

    return {
        "timestamp": time.time(),
        "input_hash": input_hash,
        "output_hash": output_hash,
        "tool_version": "1.0.0",
        "determinism_assertion": "Output is strictly derived from inputs"
    }

def verify_stamp(stamp: Dict[str, Any], inputs: Dict[str, Any], outputs: Dict[str, Any]) -> bool:
    input_str = json.dumps(inputs, sort_keys=True)
    output_str = json.dumps(outputs, sort_keys=True)

    return (stamp.get("input_hash") == hashlib.sha256(input_str.encode()).hexdigest() and
            stamp.get("output_hash") == hashlib.sha256(output_str.encode()).hexdigest())
