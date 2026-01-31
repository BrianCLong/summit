from dataclasses import dataclass


@dataclass
class SkillMetrics:
    debug_success_rate: float = 0.0
    reading_q_accuracy: float = 0.0
    concept_q_accuracy: float = 0.0
    delegation_rate: float = 0.0
