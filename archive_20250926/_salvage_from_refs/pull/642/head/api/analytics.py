from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

try:
    import spacy
    try:
        _nlp = spacy.load("en_core_web_sm")
    except Exception:  # pragma: no cover - model may be missing in tests
        _nlp = spacy.blank("en")
except Exception:  # pragma: no cover - spacy not installed
    spacy = None
    _nlp = None

router = APIRouter(prefix="/v1")

class ExtractRequest(BaseModel):
    text: str

class Entity(BaseModel):
    text: str
    label: str

class ExtractResponse(BaseModel):
    entities: List[Entity]

@router.post("/extract", response_model=ExtractResponse)
async def extract_entities(req: ExtractRequest) -> ExtractResponse:
    if not _nlp:
        return ExtractResponse(entities=[])
    doc = _nlp(req.text)
    ents = [Entity(text=e.text, label=e.label_) for e in doc.ents]
    return ExtractResponse(entities=ents)

class Node(BaseModel):
    id: str
    type: str

class Edge(BaseModel):
    source: str
    target: str
    type: str

class Suggestion(BaseModel):
    source: str
    target: str
    type: str
    confidence: float
    reason: str

class LinkRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class LinkResponse(BaseModel):
    suggestions: List[Suggestion]

@router.post("/linkify", response_model=LinkResponse)
async def linkify(req: LinkRequest) -> LinkResponse:
    existing = {(e.source, e.target) for e in req.edges}
    suggestions: List[Suggestion] = []
    for i in range(len(req.nodes)):
        for j in range(i + 1, len(req.nodes)):
            src = req.nodes[i].id
            dst = req.nodes[j].id
            if (src, dst) in existing or (dst, src) in existing:
                continue
            suggestions.append(
                Suggestion(
                    source=src,
                    target=dst,
                    type="related",
                    confidence=0.5,
                    reason="co-occurrence",
                )
            )
    return LinkResponse(suggestions=suggestions)
