
# Shadow-able wrapper decision
package composer.decision_dlp

decision = {
  "policy": "dlp",
  "mode": input.mode,
  "allow": not data.composer.dlp.block,
  "violations": input.dlp_hits,
}
