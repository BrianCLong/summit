import logging
from fastapi import FastAPI

app = FastAPI()

try:
    import spacy  # type: ignore
except Exception as e:  # pragma: no cover
    spacy = None
    logging.warning("spaCy not available: %s", e)

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception as e:  # pragma: no cover
    SentenceTransformer = None
    logging.warning("SentenceTransformer not available: %s", e)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

@app.on_event("startup")
async def startup() -> None:
    if spacy is None:
        logging.warning("spaCy model not loaded")
    if SentenceTransformer is None:
        logging.warning("SentenceTransformer model not loaded")
