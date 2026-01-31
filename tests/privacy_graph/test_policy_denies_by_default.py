import pytest

from summit.privacy_graph.config import PrivacyGraphConfig
from summit.privacy_graph.policy import PrivacyGraphPolicy, PrivacyGraphPolicyError


def test_denies_by_default():
    cfg = PrivacyGraphConfig()
    with pytest.raises(PrivacyGraphPolicyError, match="disabled"):
        PrivacyGraphPolicy.validate(cfg)

def test_requires_dp_params_when_dp_enabled():
    cfg = PrivacyGraphConfig(enabled=True, require_dp=True)
    with pytest.raises(PrivacyGraphPolicyError, match="DP required"):
        PrivacyGraphPolicy.validate(cfg)

def test_allows_valid_config():
    cfg = PrivacyGraphConfig(
        enabled=True,
        require_dp=True,
        dp_epsilon=1.0,
        dp_delta=1e-5,
        backend="plaintext"
    )
    PrivacyGraphPolicy.validate(cfg)  # Should not raise

def test_rejects_unknown_backend():
    cfg = PrivacyGraphConfig(enabled=True, require_dp=False, backend="magic_backend")
    with pytest.raises(PrivacyGraphPolicyError, match="Unknown backend"):
        PrivacyGraphPolicy.validate(cfg)
