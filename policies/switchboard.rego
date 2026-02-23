package switchboard

default allow = false

allow {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  is_valid_widget(input.resource.widget)
  input.context.classification <= data.labels.allow_max
}

is_valid_widget(w) {
  widgets := {"AgentRoster", "LiveTiles", "MeetingStage"}
  widgets[w]
}

deny[msg] {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
