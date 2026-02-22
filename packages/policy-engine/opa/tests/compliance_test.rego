package compliance.test
import future.keywords.in

import data.compliance.access

test_unlogged_decision_denied {
  not access.allow with input as {
    "region": "US",
    "feature": "unlogged_decision_path",
    "user": {"role": "internal_service"}
  }
}

test_explainability_required_eu {
  # Should deny (not allow) because feature is unexplained in EU
  not access.allow with input as {
    "region": "EU",
    "feature": "unexplained_model_output",
    "user": {"role": "internal_service"}
  }
}

test_allowed_access {
  access.allow with input as {
    "region": "US",
    "feature": "standard_feature",
    "user": {"role": "internal_service"}
  }
}
