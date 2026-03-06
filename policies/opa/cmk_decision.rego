# Wrapper decision
package composer.decision_cmk

decision = {
  "policy": "cmk",
  "mode": input.mode,
  "allow": data.composer.cmk.allow,
  "violations": missing_violations,
}

missing_violations = [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | data.composer.cmk.missing_cmk ]
