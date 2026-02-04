from summit.evidence.palantir_truth import HomomorphicProof, CausalGraphProof, ValueLedger

def test_homomorphic():
    hp = HomomorphicProof()
    # Mock behavior: 10 + 20 = 30 (encrypted space)
    assert hp.add_encrypted(10, 20) == 30

def test_causal_proof():
    cp = CausalGraphProof()
    proof = cp.prove_causality("Rain", "WetGround")
    assert "PROOF: Rain -> WetGround" in proof

def test_value_ledger():
    vl = ValueLedger()
    entry = vl.record_value(50000.0, "BreachPrevention")
    assert "VALUE: $50000.0" in entry
    assert "TX_HASH" in entry
