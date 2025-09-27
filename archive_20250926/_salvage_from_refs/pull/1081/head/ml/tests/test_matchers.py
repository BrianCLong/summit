from ml.er.matchers import EmbeddingMatcher, double_metaphone, jaro_winkler


def test_double_metaphone_similar_words():
    assert double_metaphone("Smith") == double_metaphone("Smyth")


def test_jaro_winkler_similarity_high_for_close_names():
    assert jaro_winkler("Jon", "John") > 0.9


def test_embedding_matcher_similarity():
    matcher = EmbeddingMatcher()
    texts = ["alpha", "alphaa"]
    matcher.fit(texts)
    sim = matcher.similarity(0, 1)
    assert sim > 0.7
