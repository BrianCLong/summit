from pathlib import Path
from unittest import mock

import pytest

from summit.persona.loader import load_persona


def test_persona_disabled_by_default():
    with mock.patch("summit.flags.FEATURE_SOUL_MD", False):
        assert load_persona() == ""

def test_persona_enabled_loads_default():
    with mock.patch("summit.flags.FEATURE_SOUL_MD", True):
        content = load_persona()
        assert "# Persona: Summit Agent" in content

def test_persona_custom_path(tmp_path):
    p = tmp_path / "Custom.md"
    p.write_text("Custom Persona")

    with mock.patch("summit.flags.FEATURE_SOUL_MD", True):
        content = load_persona(p)
        assert content == "Custom Persona"
