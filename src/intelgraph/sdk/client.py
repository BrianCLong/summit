from types import SimpleNamespace
from typing import Any, Protocol


# Define protocols for dependencies to avoid importing them
class PolicyRequest(Protocol):
    pass


class PolicyEngine(Protocol):
    def decide(self, req: Any) -> tuple[str, str]: ...


class Redactor(Protocol):
    def redact_text(self, text: str) -> str: ...


class IntelGraphClient:
    def __init__(
        self, *, policy_engine: PolicyEngine | None = None, redactor: Redactor | None = None
    ) -> None:
        self.policy_engine = policy_engine
        self.redactor = redactor

    def process(self, text: str) -> dict[str, Any]:
        """
        Process text.
        Returns dict with keys: `ok`, `redacted_text`, `policy`, `metadata`.
        """
        # Redaction
        processed_text = text
        if self.redactor:
            processed_text = self.redactor.redact_text(text)

        # Policy Check
        policy_result = "allow"
        policy_reason = "no_policy_engine"

        if self.policy_engine:
            # Construct a duck-typed request object
            req = SimpleNamespace(
                subject="sdk_user", action="process_text", resource="text_content", context={}
            )
            policy_result, policy_reason = self.policy_engine.decide(req)  # type: ignore

        if policy_result == "deny":
            return {
                "ok": False,
                "error": "policy_denied",
                "policy": {"decision": policy_result, "reason": policy_reason},
                "metadata": {},
            }

        return {
            "ok": True,
            "redacted_text": processed_text,
            "policy": {"decision": policy_result, "reason": policy_reason},
            "metadata": {"original_length": len(text), "processed_length": len(processed_text)},
        }
