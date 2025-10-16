# services/synthesizer/synth_service.py (HTTP server for orchestrator)
from consensus import consensus
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Req(BaseModel):
    question: str
    results: list[dict]
    contextId: str


@app.post("/synthesize")
async def synth(req: Req):
    merged, conflicts, cs = consensus(req.results)
    # evidence‑only answer: stitch key=value lines + citations
    lines = []
    citations = []
    for k, obj in merged.items():
        lines.append(f"{k}: {obj['value']}")
        for src in obj["evidence"]:
            citations.append({"url": src, "licenseId": "lic_docs"})
    answer = "\n".join(lines)
    return {
        "answer": answer,
        "claims": merged,
        "citations": citations,
        "consensusScore": cs,
        "conflicts": conflicts,
    }
