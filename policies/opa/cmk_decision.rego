package composer.decision_cmk

import data.composer.cmk

decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": cmk.allow,
  "violations": array.concat([], (missing)),
}
{
  missing := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | cmk.missing_cmk ]
}
