from typing import Dict, Optional
from pydantic import BaseModel, Field
class ContentProofSet(BaseModel):
    workspace_id: str
    root_hash: str
    proofs: Dict[str, str] = Field(default_factory=dict)
class ProofStore:
    def __init__(self): self.proofsets = {}
    def upload(self, ps): self.proofsets[ps.workspace_id] = ps
    def is_provable(self, ws_id, pid, fh):
        ps = self.proofsets.get(ws_id)
        return ps.proofs.get(pid) == fh if ps else False
