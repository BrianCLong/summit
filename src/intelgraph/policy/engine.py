import logging
import os
from typing import Protocol

from .types import PolicyDecision, PolicyRequest

logger = logging.getLogger(__name__)


class PolicyEngine(Protocol):
    def decide(self, req: PolicyRequest) -> tuple[PolicyDecision, str]: ...


class DefaultAllowEngine:
    def decide(self, req: PolicyRequest) -> tuple[PolicyDecision, str]:
        return "allow", "default_allow"


class DenyAllEngine:
    def decide(self, req: PolicyRequest) -> tuple[PolicyDecision, str]:
        return "deny", "deny_all"


class EnvPolicyEngine:
    def __init__(self) -> None:
        self.mode = os.environ.get("INTELGRAPH_POLICY_MODE", "allow_all")
        self._engine: PolicyEngine

        if self.mode == "deny_all":
            self._engine = DenyAllEngine()
        elif self.mode == "opa":
            try:
                # Attempt to import OPA engine.
                # Note: The 'opa' module is not implemented in the baseline prompt.
                # This import is expected to fail until the OPA adapter is added.
                from .opa import OPAEngine  # type: ignore

                self._engine = OPAEngine()
            except ImportError:
                logger.warning("OPA requested but not installed/found. Falling back to allow_all.")
                self._engine = DefaultAllowEngine()
        else:
            self._engine = DefaultAllowEngine()

    def decide(self, req: PolicyRequest) -> tuple[PolicyDecision, str]:
        return self._engine.decide(req)
