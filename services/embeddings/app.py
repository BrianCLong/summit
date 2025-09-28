from fastapi import FastAPI
from pydantic import BaseModel
import os, torch
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("MODEL_NAME", "intfloat/multilingual-e5-base")
DEVICE = "cuda" if (os.getenv("DEVICE","auto")=="auto" and torch.cuda.is_available()) else os.getenv("DEVICE","cpu")
BATCH_SIZE = int(os.getenv("BATCH_SIZE","32"))

app = FastAPI(title="IntelGraph Embeddings")
model = SentenceTransformer(MODEL_NAME, device=DEVICE)

class EmbReq(BaseModel):
    texts: list[str]

@app.get("/healthz")
def health(): return {"ok": True, "model": MODEL_NAME, "device": DEVICE}

@app.post("/embed")
def embed(req: EmbReq):
    outs = []
    for i in range(0, len(req.texts), BATCH_SIZE):
        chunk = req.texts[i:i+BATCH_SIZE]
        emb = model.encode(chunk, normalize_embeddings=True, convert_to_numpy=True).tolist()
        outs.extend(emb)
    return {"vectors": outs}