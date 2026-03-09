package cogops_test

import future.keywords.if
import data.cogops.allow

test_allow_valid_bundle if {
    allow with input as {
        "report": {
            "report_id": "EVID-COGOPS-1234567890ab",
            "findings": [
                {
                    "severity": "high",
                    "evidence_refs": ["EVID-COGOPS-1234567890ab"]
                }
            ]
        },
        "metrics": {
            "metrics_id": "EVID-COGOPS-1234567890ab",
            "indicators": [
                {
                    "indicator_type": "amplification"
                }
            ]
        }
    }
}

test_deny_mismatched_ids if {
    not allow with input as {
        "report": {
            "report_id": "EVID-COGOPS-111111111111",
            "findings": [
                {
                    "severity": "high",
                    "evidence_refs": ["EVID-COGOPS-111111111111"]
                }
            ]
        },
        "metrics": {
            "metrics_id": "EVID-COGOPS-222222222222",
            "indicators": [
                {
                    "indicator_type": "amplification"
                }
            ]
        }
    }
}

test_deny_missing_evidence_refs if {
    not allow with input as {
        "report": {
            "report_id": "EVID-COGOPS-1234567890ab",
            "findings": [
                {
                    "severity": "high",
                    "evidence_refs": []
                }
            ]
        },
        "metrics": {
            "metrics_id": "EVID-COGOPS-1234567890ab",
            "indicators": [
                {
                    "indicator_type": "amplification"
                }
            ]
        }
    }
}
