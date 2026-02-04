from summit.evidence.palantir_truth import StarkVerifier, OntologyAlignmentProof

def test_stark_verification():
    v = StarkVerifier()
    # Mock proof generation logic
    inp = "inputs"
    import hashlib
    h = hashlib.sha256(inp.encode()).hexdigest()[:8]
    proof = f"zk_proof_for_x_with_{h}"

    assert v.verify(proof, inp)
    assert not v.verify(proof, "bad_inputs")

def test_iso_proof():
    p = OntologyAlignmentProof()
    s1 = {"nodes": [1, 2]}
    s2 = {"nodes": ["a", "b"]}

    assert "PROOF_OK" in p.prove_isomorphism(s1, s2)
    assert "PROOF_FAILED" in p.prove_isomorphism(s1, {})
