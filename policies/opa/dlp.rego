package composer.dlp
import future.keywords

# input.dlp_hits: array of findings from your scanners (post-redaction)
# Example hit: { "severity": "high", "type": "PII_EMAIL", "path": "/logs/build-123.log" }

block {
  some h
  input.dlp_hits[h].severity == "high"
}

# Shadow-able wrapper decision
package composer.decision_dlp

decision := {
  "policy": "dlp",
  "mode": input.mode,
  "allow": not data.composer.dlp.block,
  "violations": input.dlp_hits,
}

