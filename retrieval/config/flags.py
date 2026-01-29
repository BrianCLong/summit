from dataclasses import dataclass

@dataclass(frozen=True)
class RetrievalFlags:
    RETRIEVAL_PIPELINE_ENABLED: bool = False
    QUERY_OPT_ENABLED: bool = False
    FUSION_ENABLED: bool = False
    RERANK_ENABLED: bool = False
    CONTEXT_BUILD_ENABLED: bool = False
    LLM_OPT_ENABLED: bool = False
