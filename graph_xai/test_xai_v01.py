
import sys
import os

# Add the current directory to path so we can import xai_api
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import xai_api

def test_xai_v01():
    print("Testing Graph-XAI v0.1 functions...")

    # Test get_risk_score
    risk_score = xai_api.get_risk_score({}, "entity_123")
    print(f"Risk Score: {risk_score}")
    if risk_score >= 0.8:
        print("PASS: Risk score meets criteria (>= 0.8)")
    else:
        print("FAIL: Risk score too low")
        sys.exit(1)

    # Test get_anomaly_explanation
    explanation = xai_api.get_anomaly_explanation({}, "anomaly_999")
    print(f"Explanation: {explanation}")

    expected_keys = ["anomaly_id", "explanation_type", "features", "description"]
    if all(key in explanation for key in expected_keys):
        print("PASS: Explanation contains all expected keys")
    else:
        print(f"FAIL: Explanation missing keys. Found: {list(explanation.keys())}")
        sys.exit(1)

    if explanation["features"]["transaction_volume"]["contribution"] > 0:
        print("PASS: Feature contribution present")
    else:
        print("FAIL: Feature contribution missing")
        sys.exit(1)

if __name__ == "__main__":
    test_xai_v01()
