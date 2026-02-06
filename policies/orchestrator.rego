package orchestrator

default allow := false
allow if {
    input.action == "start_task"
}
allow if {
    input.action == "complete_task"
}
allow if {
    input.action == "approve_join"
    input.user.id == input.team.leadAgentId
}
