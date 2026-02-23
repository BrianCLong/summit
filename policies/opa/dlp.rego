package composer.dlp

import future.keywords.in

# Require DLP for artifacts with PII

needs_dlp {
  "pii" in input.artifact.labels
}

missing_dlp {
  needs_dlp
  not input.artifact.dlp_scan_id
}

allow {
  not needs_dlp
}

allow {
  needs_dlp
  not missing_dlp
}

decision := {
  "policy": "dlp",
  "mode": input.mode,
  "allow": allow,
  "violations": violations,
} {
  violations := [ {"code": "DLP_REQUIRED", "artifact": input.artifact.digest} | missing_dlp ]
}
