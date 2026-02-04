import os

from .coord_anom import Finding


def is_enabled():
    return os.getenv("INTEGRITY_HARASS_DETECTOR_ENABLED", "false").lower() == "true"

def detect(signal_bundle: dict) -> list[Finding]:
    """
    Detects multi-account targeting bursts (harassment mobs).
    Flagged OFF by default.
    """
    if not is_enabled():
        return []

    # Heuristic: many distinct actors targeting one target_id
    targeting = signal_bundle.get("targeting_bursts", [])
    findings = []
    for t in targeting:
        if t.get("actor_count", 0) >= 10:
            findings.append(Finding(
                detector="harass_burst",
                score=float(t["actor_count"]),
                reason=f"multi_actor_targeting_burst: {t['actor_count']} actors on {t.get('target_id')}"
            ))
    return findings
