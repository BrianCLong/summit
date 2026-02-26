import re

class EvidenceIDGenerator:
    PATTERN = r"^SUMMIT-ORCH-(\d{4})$"

    @staticmethod
    def generate(seq: int) -> str:
        """Generates an evidence ID in the format SUMMIT-ORCH-XXXX."""
        return f"SUMMIT-ORCH-{seq:04d}"

    @staticmethod
    def validate(evidence_id: str) -> bool:
        """Validates if the evidence ID follows the SUMMIT-ORCH-XXXX format."""
        return bool(re.match(EvidenceIDGenerator.PATTERN, evidence_id))
