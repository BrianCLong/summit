from typing import Any, Dict, List

from .coord_anom import Finding
from .coord_anom import detect as detect_coord_anom
from .harass_burst import detect as detect_harass_burst


def run_all(signal_bundle: dict[str, Any]) -> list[Finding]:
    """
    Runs all registered detectors.
    """
    findings = []
    findings.extend(detect_coord_anom(signal_bundle))
    findings.extend(detect_harass_burst(signal_bundle))
    return findings
