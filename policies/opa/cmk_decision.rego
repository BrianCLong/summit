package composer.decision_cmk
import future.keywords

# Wrapper decision
decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": data.composer.cmk.allow,
  "violations": array.concat([], missing),
}

missing := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | data.composer.cmk.missing_cmk ]
