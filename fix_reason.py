import re

path = 'docs/releases/reason-codes.yml'
with open(path) as f:
    text = f.read()

to_add = """  - code: SCHEMA_MAJOR_UNSUPPORTED
    description: "Schema major unsupported"
  - code: SCHEMA_VERSION_INVALID
    description: "Schema version invalid"
  - code: JSON_PARSE_ERROR
    description: "JSON parse error"
  - code: MISSING_FIELD
    description: "Missing field"
  - code: INVALID_ENUM
    description: "Invalid enum"
  - code: DRIFT_DETECTED
    description: "Drift detected"
  - code: DRIFT_ERROR
    description: "Drift error"
  - code: SIG_ORPHAN
    description: "Orphan signature"
  - code: SIG_INVALID
    description: "Invalid signature"
  - code: COSIGN_MISSING
    description: "Cosign missing"
  - code: SIG_MISSING
    description: "Missing signature"
  - code: ATTESTATION_MISSING
    description: "Missing attestation"
  - code: SHA256SUMS_INVALID_FORMAT
    description: "Invalid format for SHA256SUMS"
  - code: INVALID_JSON
    description: "Invalid JSON"
"""

if "SCHEMA_MAJOR_UNSUPPORTED" not in text:
    with open(path, 'a') as f:
        f.write(to_add)
