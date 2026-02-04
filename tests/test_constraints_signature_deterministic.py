from summit.narrative.detectors.constraints import ConstraintExtractor

def test_constraint_signature_determinism():
    extractor = ConstraintExtractor()
    text = "It is inevitable that this approach cannot be trusted."
    evidence_ids = ["EVD-1", "EVD-2"]

    sig1 = extractor.extract(text, evidence_ids)
    sig2 = extractor.extract(text, evidence_ids)

    assert sig1.signature_id == sig2.signature_id
    assert sig1.constraints == sig2.constraints
    assert sig1.polarity == sig2.polarity
    assert sig1.confidence == sig2.confidence

def test_constraint_signature_stability_across_mutations():
    extractor = ConstraintExtractor()
    # Same constraints, different framing
    text1 = "It is inevitable that X cannot be trusted."
    text2 = "X cannot be trusted, and the result is inevitable."

    sig1 = extractor.extract(text1, ["EVD-1"])
    sig2 = extractor.extract(text2, ["EVD-2"])

    assert sig1.signature_id == sig2.signature_id
    assert sig1.constraints == sig2.constraints
