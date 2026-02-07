import future.keywords
package policy.simulation.privileged_actions

import data.summit.abac
import data.scenarios

obligation_types(decision) := {t | obligation := decision.obligations[_]; t := obligation.type}

expected_obligation_types(scenario) := {t | t := scenario.expected.obligations[_]}

scenario_decision(scenario) := decision if {
  decision := abac.decision with input as scenario.input
}

test_privileged_simulations_align_with_expectations if {
  scenario := scenarios[_]
  decision := scenario_decision(scenario)

  decision.allow == scenario.expected.allow
  decision.reason == scenario.expected.reason
  expected_types := expected_obligation_types(scenario)
  obligation_types(decision) >= expected_types
}
