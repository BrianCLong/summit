package summit.frontend_governance_test

import data.summit.frontend_governance as fg

test_frontend_change_requires_class {
  input := {
    "files": ["apps/web/src/pages/HomePage.tsx"],
    "pr": {"labels": []},
    "intake": {
      "risk_level": "low",
      "affected_surfaces": "Home"
    }
  }

  fg.deny[_] with input as input
}

test_class_three_requires_claims_label {
  input := {
    "files": ["apps/web/src/pages/HomePage.tsx"],
    "pr": {"labels": []},
    "intake": {
      "change_class": "3",
      "risk_level": "medium",
      "affected_surfaces": "Home",
      "ga_locked_ack": "yes"
    }
  }

  fg.deny[_] with input as input
}

test_ga_locked_requires_governance_label {
  input := {
    "files": ["apps/web/src/pages/HomePage.tsx"],
    "pr": {"labels": ["compliance/claims-approved"]},
    "intake": {
      "change_class": "1",
      "risk_level": "low",
      "affected_surfaces": "Home",
      "ga_locked_ack": "yes"
    }
  }

  fg.deny[_] with input as input
}

test_frozen_requires_emergency_exception {
  input := {
    "files": ["apps/web/report-studio/README.md"],
    "pr": {"labels": []},
    "intake": {
      "change_class": "0",
      "risk_level": "low",
      "affected_surfaces": "Report Studio",
      "ga_locked_ack": "yes"
    }
  }

  fg.deny[_] with input as input
}

test_valid_frontend_change_passes {
  input := {
    "files": ["apps/web/src/components/Button.tsx"],
    "pr": {"labels": ["frontend/governance-approved"]},
    "intake": {
      "change_class": "1",
      "risk_level": "low",
      "affected_surfaces": "Shared components",
      "ga_locked_ack": "yes"
    }
  }

  count(fg.deny) == 0 with input as input
}
