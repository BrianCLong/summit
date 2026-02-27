package runtime.agent_runtime

default allow = true
deny[msg] {
  not input.request.tool in data.allowlist.tools
  msg := sprintf("tool '%v' not allowed for this repo", [input.request.tool])
}

deny[msg] {
  input.agent.autonomy_level >= 3
  not input.human_approval.signed
  msg := "HITL signed approval required for autonomy >= 3"
}

violation[msg] {
  not input.evidence.claims_logging_uri
  msg := "claims logging URI missing from evidence bundle"
}

deny[msg] {
  input.evidence.audit_bundle_signed != true
  msg := "audit bundle must be signed and verifiable"
}
