import asyncio, aiohttp, google.auth
from google.auth.transport.requests import Request
from typing import List, Dict

class VertexClient:
    def __init__(self, project_id: str, location: str, embed_model: str):
        self.project_id = project_id
        self.location = location
        self.embed_model = embed_model

    async def _token(self) -> str:
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(Request())
        return creds.token

    async def embed(self, texts: List[str]) -> List[List[float]]:
        url = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.location}/publishers/google/models/{self.embed_model}:embedContent"
        headers = {"Authorization": f"Bearer {await self._token()}"}
        out = []
        async with aiohttp.ClientSession(headers=headers) as s:
            for t in texts:
                payload = {"content": {"parts": [{"text": t}]}}
                async with s.post(url, json=payload) as r:
                    r.raise_for_status()
                    data = await r.json()
                    vec = data.get("embedding", {}).get("values") or data.get("embeddings", {}).get("values") or []
                    out.append(vec)
        return out

async def embed_and_upsert(case_id: str, docs: List[Dict], client: VertexClient, upsert_cb=None):
    # docs: [{id, text, metadata}]
    vectors = await client.embed([d["text"] for d in docs])
    for d, v in zip(docs, vectors):
        d["embedding"] = v
    if upsert_cb:
        await upsert_cb(case_id, docs)
    return docs

# Usage: wires into ETL pipeline when policy allows cloud inference for non-PII fields.
