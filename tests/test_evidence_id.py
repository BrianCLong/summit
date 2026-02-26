import pytest
from evidence.evidence_id import EvidenceIDGenerator

def test_generate_evidence_id():
    assert EvidenceIDGenerator.generate(1) == "SUMMIT-ORCH-0001"
    assert EvidenceIDGenerator.generate(123) == "SUMMIT-ORCH-0123"
    assert EvidenceIDGenerator.generate(9999) == "SUMMIT-ORCH-9999"

def test_validate_evidence_id():
    assert EvidenceIDGenerator.validate("SUMMIT-ORCH-0001") is True
    assert EvidenceIDGenerator.validate("SUMMIT-ORCH-1234") is True
    assert EvidenceIDGenerator.validate("SUMMIT-ORCH-ABCD") is False
    assert EvidenceIDGenerator.validate("SUMMIT-RE-0001") is False
    assert EvidenceIDGenerator.validate("SUMMIT-ORCH-123") is False
    assert EvidenceIDGenerator.validate("SUMMIT-ORCH-12345") is False
