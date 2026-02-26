package switchboard

import future.keywords

deny[msg] {
  input.resource.widget in {"AgentRoster", "LiveTiles", "MeetingStage"}
  not input.user.is_beta_user
  msg := "Widget restricted to beta users"
}
