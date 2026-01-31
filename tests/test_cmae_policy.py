import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_deny_room_creation_without_allowlist():
  allow = json.loads((ROOT/"policy/rooms/allowlist.json").read_text())
  assert allow["enabled"] is False
  assert "unlisted-room" not in allow["allowed_room_ids"]
