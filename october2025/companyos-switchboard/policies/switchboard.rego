package switchboard

default allow = false

allow {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget == "AgentRoster" or input.resource.widget == "LiveTiles" or input.resource.widget == "MeetingStage"
  input.context.classification <= data.labels.allow_max
}

deny[msg] {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}

# policy labels example
package labels
allow_max := 2  # 0=public,1=internal,2=confidential,3=secret
