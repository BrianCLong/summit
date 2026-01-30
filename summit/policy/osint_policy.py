"""
OSINT policy gate: prevents unauthorized or overly invasive scans/imports.
Default posture: deny.
"""
from __future__ import annotations

from dataclasses import dataclass

ALLOWED_TARGET_TYPES = {"IP_ADDRESS", "DOMAIN_NAME", "HOSTNAME", "ASN", "CIDR"}

@dataclass(frozen=True)
class OsintPolicyInput:
    target: str
    target_type: str
    allowlist: list[str]
    authorization_attestation: str | None
    tor_enabled: bool = False

def evaluate(inp: OsintPolicyInput) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if inp.target_type not in ALLOWED_TARGET_TYPES:
        reasons.append("target_type_not_allowed")
    if not inp.allowlist:
        reasons.append("missing_allowlist")
    if inp.target not in set(inp.allowlist):
        reasons.append("target_not_in_allowlist")
    if not inp.authorization_attestation:
        reasons.append("missing_authorization_attestation")
    if inp.tor_enabled:
        reasons.append("tor_disabled_by_default")
    return (len(reasons) == 0, reasons)
