package composer.dlp

import rego.v1

# input.dlp_hits: array of findings from your scanners (post-redaction)
# Example hit: { "severity": "high", "type": "PII_EMAIL", "path": "/logs/build-123.log" }

block if {
  some hit in input.dlp_hits
  hit.severity == "high"
}

# Shadow-able wrapper decision
decision := {
  "policy": "dlp",
  "mode": input.mode,
  "allow": allow,
  "violations": input.dlp_hits,
}

allow if {
    not block
}
