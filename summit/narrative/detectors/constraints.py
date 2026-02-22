import hashlib
import re
from typing import List
from summit.narrative.events import ConstraintSignature

class ConstraintExtractor:
    def __init__(self):
        # Placeholder patterns for constraint extraction
        self.patterns = [
            (r"cannot be trusted", "trust_forbidden"),
            (r"inevitable", "outcome_inevitable"),
            (r"no legitimate solution except", "solution_constrained"),
            (r"impossible to", "action_impossible"),
        ]

    def extract(self, text: str, evidence_ids: List[str]) -> ConstraintSignature:
        constraints = []
        text_lower = text.lower()

        for pattern, label in self.patterns:
            if re.search(pattern, text_lower):
                constraints.append(label)

        # Sort constraints for determinism
        constraints.sort()

        # Determine polarity based on constraints (simplistic logic for now)
        if "trust_forbidden" in constraints:
            polarity = "delegitimizes"
        elif "outcome_inevitable" in constraints:
            polarity = "inevitable"
        elif "solution_constrained" in constraints:
            polarity = "forbids"
        else:
            polarity = "neutral"

        # Generate stable signature ID
        # Hashing the sorted constraints ensures stability across mutations that yield same constraints
        payload = "|".join(constraints) + f"|{polarity}"
        signature_id = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

        return ConstraintSignature(
            signature_id=signature_id,
            constraints=constraints,
            polarity=polarity,
            confidence=0.85 if constraints else 0.0,
            evidence_ids=sorted(evidence_ids)
        )
