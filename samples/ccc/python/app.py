from __future__ import annotations

from consent_guard import ConsentViolation, getTelemetry, resetTelemetry, withConsent


def fetch_profile(user_id: str) -> dict[str, str]:
  return {"user_id": user_id, "name": "Example"}


def safe_fetch_profile(user_id: str) -> dict[str, str]:
  guard = withConsent("profile.read", "analytics")
  return guard.execute(lambda: fetch_profile(user_id))


def try_disallowed(user_id: str) -> None:
  guard = withConsent("profile.read", "advertising")
  guard.execute(lambda: fetch_profile(user_id))


def main() -> None:
  resetTelemetry()
  try:
    safe_fetch_profile("abc-123")
    print("allowed", getTelemetry())
    try_disallowed("abc-123")
  except ConsentViolation as error:
    print(f"blocked: {error}")


if __name__ == "__main__":
  main()
