import os
import pytest
from programops.innovation import pitch_generator

def test_pitch_generator_disabled_by_default():
    # Ensure env var is not set or set to 0
    if os.environ.get("FEATURE_PROGRAMOPS_GENERATOR"):
        del os.environ["FEATURE_PROGRAMOPS_GENERATOR"]

    with pytest.raises(RuntimeError, match="Feature FEATURE_PROGRAMOPS_GENERATOR is disabled"):
        pitch_generator.generate_pitch()

def test_pitch_generator_enabled():
    os.environ["FEATURE_PROGRAMOPS_GENERATOR"] = "1"
    try:
        assert pitch_generator.generate_pitch() == "Pitch generated."
    finally:
        if "FEATURE_PROGRAMOPS_GENERATOR" in os.environ:
            del os.environ["FEATURE_PROGRAMOPS_GENERATOR"]

from programops.innovation import autonomy_stubs

def test_autonomy_stub_disabled_by_default():
    if os.environ.get("FEATURE_AUTONOMY_PITCH"):
        del os.environ["FEATURE_AUTONOMY_PITCH"]

    with pytest.raises(RuntimeError, match="Feature FEATURE_AUTONOMY_PITCH is disabled"):
        autonomy_stubs.integration_stub()

def test_autonomy_stub_enabled():
    os.environ["FEATURE_AUTONOMY_PITCH"] = "1"
    try:
        assert autonomy_stubs.integration_stub() == "Autonomy integration stub active."
    finally:
        if "FEATURE_AUTONOMY_PITCH" in os.environ:
            del os.environ["FEATURE_AUTONOMY_PITCH"]
