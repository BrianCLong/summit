from __future__ import annotations

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from datetime import datetime, timedelta

from app.redact import hash_identifier, redact


def test_redact_patterns():
    text = "Contact @user via email test@example.com or +1-202-555-0182 visit https://example.com"
    out = redact(text)
    assert "@user" not in out
    assert "test@example.com" not in out
    assert "0182" not in out
    assert "<URL>" in out


def test_hash_rotates_daily():
    now = datetime(2024, 1, 1)
    later = now + timedelta(days=1)
    h1 = hash_identifier("abc", now=now)
    h2 = hash_identifier("abc", now=now)
    assert h1 == h2
    h3 = hash_identifier("abc", now=later)
    assert h1 != h3
