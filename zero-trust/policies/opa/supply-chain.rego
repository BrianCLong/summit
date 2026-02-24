package supply_chain

import rego.v1

# Default to deny
default allow := false

# Allow if at least one valid signature is present
allow if {
    count(valid_signatures) > 0
}

# Define what constitutes a valid signature
valid_signatures contains sig if {
    some sig in input
    sig.critical.type == "cosign container image signature"

    # Ensure the signature applies to the correct image (optional, depends on how input is constructed)
    # For now, we trust cosign verify has filtered for the image digest.
}

# Deny if signatures are missing
deny contains msg if {
    count(valid_signatures) == 0
    msg := "No valid Cosign signatures found"
}
