import pytest
from unittest.mock import patch
from graphrag.federation.coordinator import Coordinator
from graphrag.federation.update_signing import SignedUpdate

@patch("graphrag.federation.coordinator.federation_enabled", return_value=True)
def test_federated_update_rejected_unsigned(mock_enabled):
    coord = Coordinator()
    update = SignedUpdate("model1", "hash", "bad_sig")

    with pytest.raises(ValueError, match="Invalid signature"):
        coord.apply_update(update)

@patch("graphrag.federation.coordinator.federation_enabled", return_value=False)
def test_federated_update_ignored_when_disabled(mock_enabled):
    coord = Coordinator()
    update = SignedUpdate("model1", "hash", "sig")
    assert coord.apply_update(update) is False
