from retrieval.pipeline import run_retrieval
from retrieval.config.flags import RetrievalFlags
from retrieval.types import ContextPack

def test_pipeline_flag_off():
    # Default flags are all False
    flags = RetrievalFlags()
    tenant_ctx = {"tenant_id": "test"}

    result = run_retrieval("test query", flags=flags, tenant_ctx=tenant_ctx)

    assert isinstance(result, ContextPack)
    assert result.reason == "pipeline_disabled"
    assert len(result.chunks) == 0
    assert len(result.citations) == 0
    print("PASS: test_pipeline_flag_off")

def test_pipeline_flag_on():
    flags = RetrievalFlags(RETRIEVAL_PIPELINE_ENABLED=True)
    tenant_ctx = {"tenant_id": "test"}

    result = run_retrieval("test query", flags=flags, tenant_ctx=tenant_ctx)

    assert isinstance(result, ContextPack)
    assert result.reason == "pipeline_stub"
    print("PASS: test_pipeline_flag_on")

if __name__ == "__main__":
    test_pipeline_flag_off()
    test_pipeline_flag_on()
