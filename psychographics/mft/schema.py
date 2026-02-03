from dataclasses import dataclass
from typing import Optional


@dataclass
class MFTScore:
    care_harm: float
    fairness_cheating: float
    loyalty_betrayal: float
    authority_subversion: float
    sanctity_degradation: float
    liberty_oppression: Optional[float] = None
