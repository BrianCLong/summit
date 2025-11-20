from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[4] / "generated" / "ccc" / "python"
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))

from consent_guard import ConsentViolation, getTelemetry, resetTelemetry, withConsent  # type: ignore  # noqa: E402


def test_allows_authorized_scope() -> None:
  resetTelemetry()
  guard = withConsent("profile.read", "analytics")

  result = guard.execute(lambda: {"ok": True})

  assert result == {"ok": True}
  telemetry = getTelemetry()
  assert telemetry[0]["lawful_basis"] == "legitimate_interest"


def test_blocks_disallowed_purpose() -> None:
  resetTelemetry()
  with pytest.raises(ConsentViolation):
    withConsent("profile.read", "advertising")
