import os

def review_decision():
    if not os.path.exists("artifacts/dissent_record.json"):
        raise Exception("CDA gate failed: dissent required before approval.")

    return True
