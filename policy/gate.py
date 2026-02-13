from typing import List

BANNED_PHRASES = ["guaranteed $", "guarantee income", "risk-free profits"]


def check(text: str) -> list[str]:
    findings: list[str] = []
    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            findings.append(f"POLICY_DENY: found banned phrase '{phrase}'")
    return findings
