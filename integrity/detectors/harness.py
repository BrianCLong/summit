from typing import Dict, Any, List
from .coord_anom import Finding, detect as detect_coord_anom
from .harass_burst import detect as detect_harass_burst

def run_all(signal_bundle: Dict[str, Any]) -> List[Finding]:
    """
    Runs all registered detectors.
    """
    findings = []
    findings.extend(detect_coord_anom(signal_bundle))
    findings.extend(detect_harass_burst(signal_bundle))
    return findings
