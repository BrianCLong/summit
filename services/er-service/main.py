from difflib import SequenceMatcher

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="er-service")


class MatchIn(BaseModel):
    a: dict
    b: dict


@app.post("/match")
def match(m: MatchIn):
    if m.a.get("email") and m.a.get("email") == m.b.get("email"):
        return {"decision": "MERGE", "score": 1.0, "why": [{"feature": "email", "weight": 1.0}]}
    sim = SequenceMatcher(a=m.a.get("name", ""), b=m.b.get("name", "")).ratio()
    return {
        "decision": "REVIEW" if sim > 0.8 else "NO_MERGE",
        "score": sim,
        "why": [{"feature": "name_sim", "weight": sim}],
    }
