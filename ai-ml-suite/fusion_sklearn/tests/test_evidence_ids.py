from summit_fusion.evidence import EvidenceId, sha256_bytes, stable_json_dumps


def test_stable_json():
    obj1 = {"b": 2, "a": 1}
    obj2 = {"a": 1, "b": 2}

    s1 = stable_json_dumps(obj1)
    s2 = stable_json_dumps(obj2)

    assert s1 == s2
    assert s1 == '{"a":1,"b":2}'

def test_evidence_id_formatting():
    digest = sha256_bytes(b'hello')
    ev = EvidenceId(namespace="test", digest=digest)

    assert str(ev) == "EV:test:2cf24dba5fb0a30e"
