import spacy
from fastapi import FastAPI
from pydantic import BaseModel

# Load spaCy model (ensure it's downloaded, e.g., 'python -m spacy download en_core_web_sm')
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

app = FastAPI()


class TextRequest(BaseModel):
    text: str


class Entity(BaseModel):
    text: str
    label: str


class EntitiesResponse(BaseModel):
    entities: list[Entity]


@app.post("/extract_entities", response_model=EntitiesResponse)
async def extract_entities(request: TextRequest):
    doc = nlp(request.text)
    entities = []
    for ent in doc.ents:
        entities.append(Entity(text=ent.text, label=ent.label_))
    return {"entities": entities}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
