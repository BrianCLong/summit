package intelgraph.llm.route

default allow = false
reason := ""

us_only := {"openai", "anthropic", "google"}

violation[msg] {
  input.classification == "TS"
  not us_only[input.provider]
  msg := "TS requires US-resident provider"
}

violation[msg] {
  input.requiresCitations
  input.provider != "perplexity"
  msg := "Citations requested; must use Perplexity"
}

allow {
  count(violation) == 0
}

reason := concat(", ", violation) {
  count(violation) > 0
}
