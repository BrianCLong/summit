import pytest

from privacy_first_gnn.he.api import HEInterface
from privacy_first_gnn.he.mock_backend import MockHEBackend


def test_he_contract_flow():
    backend = MockHEBackend()
    he = HEInterface(backend)

    public_params = "MOCK_PUBLIC_PARAMS"
    secret_key = "MOCK_SECRET_KEY"

    # 1. Encrypt at source (edge)
    features = {"feat1": 0.5, "feat2": 0.1}
    cipher_features = {k: he.encrypt(v, public_params) for k, v in features.items()}

    for v in cipher_features.values():
        assert v.startswith("CIPHER:")

    # 2. Eval on server
    cipher_graph = {} # Simplified
    cipher_score = he.eval_model(cipher_graph, cipher_features)

    assert cipher_score.startswith("SCORE:")
    assert "CIPHER:0.5" in cipher_score

    # 3. Decrypt at edge
    plain_score = he.decrypt(cipher_score, secret_key)
    assert plain_score.startswith("DECIDED:")

def test_he_contract_invalid_key():
    backend = MockHEBackend()
    he = HEInterface(backend)

    with pytest.raises(ValueError, match="Invalid secret key"):
        he.decrypt("SCORE:anything", "WRONG_KEY")

def test_he_contract_plaintext_rejection():
    backend = MockHEBackend()
    he = HEInterface(backend)

    cipher_features = {"feat1": "PLAINTEXT_ERROR"}
    with pytest.raises(ValueError, match="is not encrypted!"):
        he.eval_model({}, cipher_features)
