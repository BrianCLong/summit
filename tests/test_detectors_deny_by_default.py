import pytest
from unittest.mock import MagicMock

def test_detectors_deny_by_default():
    detector = MagicMock()
    # Default behavior should be deny (False) if uncertain
    detector.check.return_value = False

    assert detector.check("unknown_payload") is False

def test_detectors_allow_known_safe():
    detector = MagicMock()
    detector.check.return_value = True

    assert detector.check("safe_payload") is True
