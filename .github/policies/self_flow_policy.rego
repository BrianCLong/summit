package summit.self_flow

default allow = false

allow if {
    input.trajectory.policy.blocked == false
    input.trajectory.policy.piiRisk == "low"
}
