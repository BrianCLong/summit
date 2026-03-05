import os

FEATURE_CDA = os.environ.get("FEATURE_CDA", "OFF").upper() == "ON"

def review_decision():
    if FEATURE_CDA:
        if not os.path.exists("artifacts/dissent_record.json"):
            raise Exception("CDA gate failed: dissent required before approval.")

    return True
