package summit.skills

default allow = false

default permissions = {}

permissions = object.get(data.summit.skills.overlays.permissions, input.skill, {})

deny[msg] {
  finding := input.findings[_]
  finding.severity == "high"
  msg := sprintf("High severity finding: %s", [finding.message])
}

deny[msg] {
  input.requested.network
  not permissions.network
  msg := "Network access denied"
}

deny[msg] {
  input.requested.shell
  not permissions.shell
  msg := "Shell execution denied"
}

deny[msg] {
  input.requested.fs_write
  not permissions.fs_write
  msg := "Filesystem write denied"
}

deny[msg] {
  input.requested.credentials
  not permissions.credentials
  msg := "Credential access denied"
}

allow {
  count(deny) == 0
}
