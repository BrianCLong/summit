import re

_EVD_RE = re.compile(r"^EVD-LLMTRAININGCHANGE-[A-Z]+-\d{3}$")

def validate_evd_id(evd_id: str) -> None:
    if not _EVD_RE.match(evd_id):
        raise ValueError(f"Invalid Evidence ID: {evd_id}")
