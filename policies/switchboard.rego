import future.keywords.in
import future.keywords.if
package switchboard

default allow = false

allow if {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget in {"AgentRoster", "LiveTiles", "MeetingStage"}
  input.context.classification <= data.labels.allow_max
}

deny[msg] if {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
