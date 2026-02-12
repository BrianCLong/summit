package orchestrator

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
