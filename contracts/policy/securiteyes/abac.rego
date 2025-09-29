package securiteyes.abac

default allow := false

allow if {
  has_role("owner")
}

allow if {
  has_role("maintainer")
  input.action == "merge_pr"
  not repo_has_label("frozen")
}

allow if {
  input.subject.mfa == true
  input.action == "deploy"
  input.environment == "staging"
}

deny[msg] if {
  input.action == "merge_pr"
  input.resource.merge.provenance_verified == false
  msg := "merge blocked: unverified provenance"
}

deny[msg] if {
  input.action == "deploy"
  input.resource.freeze_window.active == true
  msg := "deploy blocked: freeze window"
}

has_role(role) if {
  roles := input.subject.roles
  roles != null
  some idx
  roles[idx] == role
}

repo_has_label(label) if {
  labels := input.resource.repo.labels
  labels != null
  some idx
  labels[idx] == label
}
