import os
import json
import pytest
import tempfile
import hashlib
from agents.ai_supply_chain_firewall.dependency_interceptor import intercept_dependencies

def test_intercept_dependencies():
    suggestions = [
        "requests",
        "react",
        "AUTH_TOKEN=supersecret"
    ]

    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as f:
        output_path = f.name

    try:
        intercept_dependencies(suggestions, output_path)

        with open(output_path, "r") as f:
            lines = f.readlines()

        assert len(lines) == 2

        data1 = json.loads(lines[0])
        data2 = json.loads(lines[1])

        assert data1["hash"] == hashlib.sha256(b"requests").hexdigest()
        assert data2["hash"] == hashlib.sha256(b"react").hexdigest()
    finally:
        os.remove(output_path)
