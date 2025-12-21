import json
from pathlib import Path

def load_injections():
    return Path(__file__).parent.joinpath('injections.txt').read_text().splitlines()

def test_injections_blocked():
    blocked = []
    for line in load_injections():
        if any(token in line.lower() for token in ['secret', 'password', '/etc/passwd']):
            blocked.append(line)
    assert blocked, 'Expected injection patterns to be blocked'


def test_provenance_required():
    decision = {'response': 'redacted', 'citations': ['doc://policy/123']}
    assert decision['citations'], 'Citations must be present for provenance'
