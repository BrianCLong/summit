package orchestrator
import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow = false

allow {
    input.action == "start_task"
}

allow {
    input.action == "complete_task"
}

allow {
    input.action == "approve_join"
    input.user.id == input.team.leadAgentId
}
