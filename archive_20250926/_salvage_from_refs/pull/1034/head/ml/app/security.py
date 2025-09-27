import os, hmac, hashlib

ML_WEBHOOK_SECRET = os.getenv("ML_WEBHOOK_SECRET", "change-me")

def sign_payload(payload_bytes: bytes) -> str:
    sig = hmac.new(ML_WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return sig

def optional_spacy():
    if os.getenv("USE_SPACY","false").lower() == "true":
        import spacy
        return spacy.load("en_core_web_sm")
    return None