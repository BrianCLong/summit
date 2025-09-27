package ci.gates.slo

default allow = false

# inputs: { "metrics": {"nlq_burn_rate_6h": 0.03, "cypher_burn_rate_6h": 0.02} }
allow {
  input.metrics.nlq_burn_rate_6h <= 0.05
  input.metrics.cypher_burn_rate_6h <= 0.05
}

