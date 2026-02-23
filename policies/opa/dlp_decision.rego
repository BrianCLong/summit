package composer.decision_dlp

import data.composer.dlp

decision := {
  "policy": "dlp",
  "mode": input.mode,
  "allow": not dlp.block,
  "violations": input.dlp_hits,
}
