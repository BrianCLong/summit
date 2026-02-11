package composer.decision_dlp

import future.keywords

decision := {
  "policy": "dlp",
  "mode": input.mode,
  "allow": not data.composer.dlp.block,
  "violations": input.dlp_hits,
}
