from services.index_store.proofs.store import ContentProofSet, ProofStore
from services.retrieval.proof_filter import ProofFilter, RetrievalHit


def test_filter():
    ps = ProofStore()
    ps.upload(ContentProofSet(workspace_id="w1", root_hash="r1", proofs={"p1": "h1"}))
    f = ProofFilter(ps)
    hits = [RetrievalHit("p1", "h1", "c1"), RetrievalHit("p2", "h2", "c2")]
    res = f.filter("w1", hits)
    assert len(res) == 1
    assert res[0].path_id == "p1"
