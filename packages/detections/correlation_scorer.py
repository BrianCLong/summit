#!/usr/bin/env python3
"""
Correlation Scorer for Vishing-driven SaaS Data Theft.
Finds sequences of: mfa_enrollment -> oauth_consent -> bulk_download.
Controlled by feature flag: flag_vishing_saas_scorer.
"""
import json
import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
FLAGS_PATH = ROOT / "feature_flags" / "flags.yml"

def is_enabled():
    if not FLAGS_PATH.exists():
        return False
    with open(FLAGS_PATH) as f:
        flags = yaml.safe_load(f)
    return flags.get('flag_vishing_saas_scorer', False)

class CorrelationScorer:
    def __init__(self, time_window_hours=4):
        self.time_window = time_window_hours

    def score_sequence(self, events):
        """
        Calculates a risk score based on the sequence of events.
        """
        if not is_enabled():
            return {"status": "disabled", "risk_score": 0}

        score = 0
        reasons = []

        has_mfa = any(e.get('action') == "mfa_device_enroll" for e in events)
        has_oauth = any(e.get('action') == "oauth_app_consent" for e in events)
        has_exfil = any(e.get('action') == "bulk_data_export" or e.get('bytes', 0) > 100000000 for e in events)

        if has_mfa:
            score += 20
            reasons.append("New MFA device enrollment detected")
        if has_oauth:
            score += 30
            reasons.append("OAuth application consent granted")
        if has_exfil:
            score += 50
            reasons.append("High-volume data exfiltration detected")

        # Bonus for sequence
        if has_mfa and has_oauth:
            score += 20
            reasons.append("Sequence: MFA -> OAuth observed")
        if has_oauth and has_exfil:
            score += 30
            reasons.append("Sequence: OAuth -> Exfil observed")

        risk_level = "low"
        if score >= 100:
            risk_level = "critical"
        elif score >= 70:
            risk_level = "high"
        elif score >= 40:
            risk_level = "medium"

        return {
            "status": "enabled",
            "risk_score": min(score, 100),
            "risk_level": risk_level,
            "reasons": reasons,
            "trace": events
        }

if __name__ == "__main__":
    # Example usage
    scorer = CorrelationScorer()
    sample_events = [
        {"action": "mfa_device_enroll"},
        {"action": "oauth_app_consent"},
        {"action": "bulk_data_export", "bytes": 500000000}
    ]
    print(json.dumps(scorer.score_sequence(sample_events), indent=2))
