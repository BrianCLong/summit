from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import hashlib
import json

class Tool(BaseModel):
    name: str
    description: Optional[str] = None
    input_schema: Dict[str, Any] = Field(default_factory=dict, alias="inputSchema")

    class Config:
        populate_by_name = True

    def fingerprint(self) -> str:
        # Deterministic fingerprint of the tool definition
        data = self.model_dump(exclude_none=True, by_alias=True)
        # Sort keys for stable JSON
        serialized = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

class Catalog(BaseModel):
    tools: List[Tool]
    catalog_hash: str = ""

    def rehash(self):
        # Sort tools by name for stable list order
        self.tools.sort(key=lambda t: t.name)

        hasher = hashlib.sha256()
        for tool in self.tools:
            hasher.update(tool.fingerprint().encode('utf-8'))
        self.catalog_hash = hasher.hexdigest()
