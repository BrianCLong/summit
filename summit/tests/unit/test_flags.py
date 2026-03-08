import os
from unittest.mock import patch

from summit.flags import is_feature_enabled


def test_is_feature_enabled():
    with patch.dict(os.environ, {"TEST_FEATURE": "true"}):
        assert is_feature_enabled("TEST_FEATURE") is True

    with patch.dict(os.environ, {"TEST_FEATURE": "false"}):
        assert is_feature_enabled("TEST_FEATURE") is False

    with patch.dict(os.environ, {}, clear=True):
        assert is_feature_enabled("TEST_FEATURE", default=True) is True
        assert is_feature_enabled("TEST_FEATURE", default=False) is False
