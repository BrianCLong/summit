package switchboard
import future.keywords.in

import rego.v1

import future.keywords


default allow = false

allow if {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget in {"AgentRoster", "LiveTiles", "MeetingStage"}
  input.context.classification <= data.labels.allow_max
}

deny contains msg if {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
