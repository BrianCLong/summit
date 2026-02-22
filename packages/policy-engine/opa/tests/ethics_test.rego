import future.keywords
package ethics.test

import data.ethics.interaction

test_private_regulator_interaction_denied {
  deny := interaction.deny with input as {
    "interaction": {
      "type": "regulator",
      "channel": "private"
    }
  }
  count(deny) > 0
  deny["private_regulator_interaction"]
}

test_quid_pro_quo_denied {
  deny := interaction.deny with input as {
    "interaction": {
      "offer": "favorable_treatment"
    }
  }
  count(deny) > 0
  deny["quid_pro_quo"]
}

test_clean_interaction_allowed {
  deny := interaction.deny with input as {
    "interaction": {
      "type": "regulator",
      "channel": "public_forum"
    }
  }
  count(deny) == 0
}
