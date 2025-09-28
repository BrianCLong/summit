from fastapi import FastAPI
from pydantic import BaseModel
import os, torch
from transformers import pipeline

MODEL_NAME = os.getenv("MODEL_NAME", "mistralai/Mistral-7B-Instruct-v0.3")
DEVICE = "cuda" if (os.getenv("DEVICE","auto")=="auto" and torch.cuda.is_available()) else os.getenv("DEVICE","cpu")
MAX_TOKENS = int(os.getenv("MAX_TOKENS","768"))

app = FastAPI(title="IntelGraph Summaries")
summarizer = pipeline("summarization", model=MODEL_NAME, device=0 if DEVICE=="cuda" else -1)

class SumReq(BaseModel):
    text: str

@app.get("/healthz")
def health(): return {"ok": True, "model": MODEL_NAME, "device": DEVICE}

@app.post("/summarize")
def summarize(req: SumReq):
    res = summarizer(req.text, max_length=MAX_TOKENS, min_length=30, do_sample=False)
    return {"summary": res[0]["summary_text"]}