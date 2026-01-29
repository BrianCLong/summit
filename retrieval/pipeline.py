from retrieval.config.flags import RetrievalFlags
from retrieval.types import ContextPack

def run_retrieval(query: str, *, flags: RetrievalFlags, tenant_ctx: dict) -> ContextPack:
    """
    Orchestrates retrieval stages.
    Deterministic by default; must not emit timestamps except via evidence stamp writer.
    """
    if not flags.RETRIEVAL_PIPELINE_ENABLED:
        # Legacy path placeholder: keep behavior unchanged in Summit integration.
        return ContextPack.empty(reason="pipeline_disabled")

    # TODO: wire query_opt -> candidates -> fusion -> rerank -> context_build
    return ContextPack.empty(reason="pipeline_stub")
