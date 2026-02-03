def compfeat_event(name: str, fields: dict) -> dict:
  # Centralized shape to prevent log sprawl.
  return {"event": f"compfeat.{name}", "fields": fields}
