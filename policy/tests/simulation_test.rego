package summit.abac.simulation

import data.privileged_actions
import data.summit.abac

obligation_types(obligations) = types {
  types := {o.type | o := obligations[_]}
}

test_privileged_action_simulations {
  scenario := privileged_actions[_]
  decision := abac.decision with input as scenario.input

  decision.allow == scenario.expect.allow
  decision.reason == scenario.expect.reason

  expected := {t | t := scenario.expect.obligationTypes[_]}
  obligation_types(decision.obligations) == expected
}
