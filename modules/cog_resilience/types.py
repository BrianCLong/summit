from typing import Literal, TypedDict


class AggregateIndicator(TypedDict):
    time_bucket: str
    region_bucket: str
    indicator_type: Literal["morale_proxy", "cohesion_proxy", "trust_proxy", "decision_friction_proxy", "polarization_proxy"]
    value: float
    confidence: float
    method: Literal["survey_aggregate", "content_aggregate", "admin_aggregate", "synthetic_eval"]
    limits: str
