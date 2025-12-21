package compliance.explainability

# Require explanation for all AI decisions
deny[msg] {
    input.type == "ai_decision"
    not input.explanation
    msg := "AI decision missing explanation"
}
