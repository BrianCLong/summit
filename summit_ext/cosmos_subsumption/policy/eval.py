from __future__ import annotations
from .model import ExposureRule

class PolicyError(Exception): ...

def validate(rule: ExposureRule) -> None:
    # deny-by-default
    if rule.exposure == "internet":
        if not rule.domain:
            raise PolicyError("internet exposure requires domain")
        if not rule.auth.required and not rule.breakglass:
            raise PolicyError("public exposure without auth requires breakglass=true")
