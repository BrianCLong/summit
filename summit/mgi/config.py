from dataclasses import dataclass, field
import os

@dataclass(frozen=True)
class MGIConfig:
    enabled: bool = field(default_factory=lambda: os.getenv("MGI_ENABLED", "0") == "1")
    keyword_graph: str = field(default_factory=lambda: os.getenv("MGI_KEYWORD_GRAPH", "off"))
    skeleton: str = field(default_factory=lambda: os.getenv("MGI_SKELETON", "off"))
    retriever: str = field(default_factory=lambda: os.getenv("MGI_RETRIEVER", "vector_only"))
    key_chunks_k: int = field(default_factory=lambda: int(os.getenv("MGI_KEY_CHUNKS_K", "200")))
    keyword_max_degree: int = field(default_factory=lambda: int(os.getenv("MGI_KEYWORD_MAX_DEGREE", "500")))
