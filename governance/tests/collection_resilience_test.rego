package collection.policy

test_deprecated_dv360_method_denied {
  test_input := {
    "request": {
      "service": "dv360",
      "method": "advertisers.campaigns.targetingTypes.assignedTargetingOptions.list"
    }
  }
  some msg
  deny[msg] with input as test_input
  msg == "deprecated dv360 method called: advertisers.campaigns.targetingTypes.assignedTargetingOptions.list"
}

test_unpinned_merchant_api_denied {
  test_input := {
    "request": {
      "service": "merchant-api",
      "version_pinned": false
    }
  }
  some msg
  deny[msg] with input as test_input
  msg == "merchant api request must pin version"
}

test_high_risk_without_exception_denied {
  test_input := {
    "crawl": {
      "source_tier": "high-risk/contested"
    }
  }
  some msg
  deny[msg] with input as test_input
  msg == "high-risk crawl requires approved exception_id"
}

test_missing_evidence_field_denied {
  test_input := {
    "evidence": {
      "collected_at_utc": "2026-02-24T00:00:00Z",
      "content_hash_sha256": "abc",
      "collector_identity": "collector-a",
      "policy_decision_id": "decision-1"
    }
  }
  some msg
  deny[msg] with input as test_input
  msg == "missing required evidence field: source_url"
}

test_provider_concentration_warns {
  test_input := {
    "metrics": {
      "contested_source_provider_share": 0.57
    }
  }
  some msg
  warn[msg] with input as test_input
  msg == "contested provider concentration above threshold: 0.57"
}

test_valid_payload_allows {
  test_input := {
    "request": {
      "service": "merchant-api",
      "version_pinned": true
    },
    "crawl": {
      "source_tier": "licensed",
      "robots_allows": true
    },
    "evidence": {
      "source_url": "https://example.com/a",
      "collected_at_utc": "2026-02-24T00:00:00Z",
      "content_hash_sha256": "abc",
      "collector_identity": "collector-a",
      "policy_decision_id": "decision-1"
    }
  }
  denied := deny with input as test_input
  count(denied) == 0
}
