import os

import numpy as np
import pytest
from summit_fusion.embedding import EmbeddingTransformer


def test_dummy_backend_default():
    transformer = EmbeddingTransformer()
    assert transformer.backend == 'dummy'

    transformer.fit(["hello world", "foo bar"])
    out = transformer.transform(["hello world", "foo bar"])

    assert isinstance(out, np.ndarray)
    assert out.shape == (2, 384)
    assert np.all(out == 0.0)

def test_sentence_transformer_backend_blocked_by_default(monkeypatch):
    monkeypatch.delenv("SUMMIT_FUSION_ALLOW_NETWORK", raising=False)

    transformer = EmbeddingTransformer(backend='sentence-transformers')

    with pytest.raises(RuntimeError, match="Network access disabled"):
        transformer.fit(["hello"])
