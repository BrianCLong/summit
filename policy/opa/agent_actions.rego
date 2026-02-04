package policy.opa.agent_actions

default allow = false

allow {
    input.action == "execute"
    input.judge_score >= input.threshold
}
