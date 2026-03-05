package summit.memory.guardrails

# Deny direct memory writes for high-trust tiers unless explicitly approved.
deny contains msg if {
  input.operation == "write"
  input.tier in {"org", "case"}
  not input.human_approved
  msg := sprintf("human approval required for %s tier writes", [input.tier])
}

# Enforce proposal workflow for all memory writes.
deny contains "memory writes must use proposal workflow" if {
  input.operation == "write"
  input.proposal_id == ""
}

# Prevent procedural-instruction poisoning of fact stores.
deny contains "facts store rejected due to instruction-like content" if {
  input.operation == "write"
  startswith(input.target_path, "/summit_memory/cases/")
  contains(input.target_path, "/knowledge/facts")
  re_match("(?i)(ignore policy|disable guardrail|exfiltrate|bypass)", input.content)
}

# Require provenance completeness for fact writes.
deny contains "facts write requires source_id, quote_pointer, confidence" if {
  input.operation == "write"
  contains(input.target_path, "/knowledge/facts")
  not input.provenance.source_id
}

deny contains "facts write requires source_id, quote_pointer, confidence" if {
  input.operation == "write"
  contains(input.target_path, "/knowledge/facts")
  not input.provenance.quote_pointer
}

deny contains "facts write requires source_id, quote_pointer, confidence" if {
  input.operation == "write"
  contains(input.target_path, "/knowledge/facts")
  not input.provenance.confidence
}

allow if not deny[_]
