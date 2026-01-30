from typing import List

from summit.protocols.envelope import SummitEnvelope


class PromptInjectionRule:
    def check(self, env: SummitEnvelope) -> list[str]:
        reasons = []
        # Basic check: if provenance is untrusted and content looks suspicious
        provenance = env.security.get("provenance", "untrusted_external")
        if provenance == "untrusted_external":
            content = env.text
            # Simple heuristic for now
            if "ignore previous instructions" in content.lower():
                reasons.append("prompt_injection_detected")
            if "reveal your system prompt" in content.lower():
                 reasons.append("prompt_injection_detected")
        return reasons
