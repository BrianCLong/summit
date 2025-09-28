import os, requests
EMB_URL = os.getenv("EMBEDDINGS_URL", "http://embeddings:9100")

def embed_texts(texts):
    if not texts: return []
    r = requests.post(f"{EMB_URL}/embed", json={"texts": texts}, timeout=30)
    r.raise_for_status()
    return r.json()["vectors"]

def to_message_record(rec: dict):
    # rec has text; attach embedding (single text)
    vec = embed_texts([rec.get("text","")])
    rec["embed"] = (vec[0] if vec else [])
    return rec