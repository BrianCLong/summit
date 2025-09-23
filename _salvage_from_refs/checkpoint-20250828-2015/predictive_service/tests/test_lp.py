from app import score_pair, EMB
def test_score_pair_missing():
    assert score_pair("nope","nope2") == 0.0

def test_embeddings_loaded():
    assert isinstance(EMB, dict)
