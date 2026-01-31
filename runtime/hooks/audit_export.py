"""
Audit export hook (scaffold).
Must produce schema-valid evidence artifacts without logging secrets.
"""

def emit_audit_event(event: dict) -> None:
  # TODO: integrate with Summit logger/export sink
  # IMPORTANT: never include raw secrets or full tool outputs
  return
