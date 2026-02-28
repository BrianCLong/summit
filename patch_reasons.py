import re

with open('docs/releases/reason-codes.yml', 'r') as f:
    content = f.read()

# remove everything we appended before
content = re.sub(r'  SCHEMA_MAJOR_UNSUPPORTED:.*', '', content, flags=re.DOTALL)

# Correctly format it
new_codes = """  - code: SCHEMA_MAJOR_UNSUPPORTED
    description: "The provided schema major version is not supported by the system."
  - code: SCHEMA_VERSION_INVALID
    description: "The provided schema version format is invalid."
  - code: JSON_PARSE_ERROR
    description: "The provided JSON could not be parsed."
  - code: MISSING_FIELD
    description: "A required field is missing from the bundle."
  - code: INVALID_ENUM
    description: "A field contains an invalid enum value."
  - code: DRIFT_DETECTED
    description: "Environment drift detected compared to expected state."
  - code: DRIFT_ERROR
    description: "An error occurred while checking for environment drift."
  - code: SIG_ORPHAN
    description: "A signature is present but the corresponding file is missing."
  - code: SIG_INVALID
    description: "The signature provided is invalid."
  - code: COSIGN_MISSING
    description: "The cosign tool is not available in the environment."
  - code: SIG_MISSING
    description: "A required signature is missing."
  - code: ATTESTATION_MISSING
    description: "A required attestation is missing."
  - code: SHA256SUMS_INVALID_FORMAT
    description: "The sha256sums file has an invalid format."
  - code: INVALID_JSON
    description: "Invalid JSON encountered during verification."
"""
content += new_codes

with open('docs/releases/reason-codes.yml', 'w') as f:
    f.write(content)
