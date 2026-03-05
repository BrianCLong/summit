from summit_fusion.evidence import EvidenceId, sha256_bytes, stable_json_dumps


def test_stable_json_dumps():
    d1 = {"b": 2, "a": 1}
    d2 = {"a": 1, "b": 2}
    assert stable_json_dumps(d1) == stable_json_dumps(d2)
    assert stable_json_dumps(d1) == '{"a":1,"b":2}'

def test_evidence_id():
    d = {"test": "data"}
    ev = EvidenceId.from_dict("TEST", d)
    assert ev.namespace == "TEST"
    assert len(ev.digest) == 64
    assert str(ev).startswith("EV:TEST:")
    assert len(str(ev)) == 8 + 16 # "EV:TEST:" + 16 chars of hash
