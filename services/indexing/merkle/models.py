from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class MerkleNode(BaseModel):
    """A node in the Merkle tree."""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str  # This will be the opaque ID (HMAC) in production-ready builder
    hash: str
    is_dir: bool = False
    children: Dict[str, "MerkleNode"] = Field(default_factory=dict)

MerkleNode.model_rebuild()

class MerkleTree(BaseModel):
    root: MerkleNode
    version: str = "1.0.0"
    def get_root_hash(self) -> str: return self.root.hash
