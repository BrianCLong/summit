package summit.cib

# Minimal tests to keep policy behavior deterministic.

test_denies_when_missing_evidence {
  not allow with input as {
    "signals": [
      {"id":"CIB.TEMPORAL.SYNC","score":0.10},
      {"id":"CIB.TEXT.REUSE","score":0.10},
      {"id":"CIB.URL.REUSE","score":0.10},
      {"id":"CIB.NETWORK.COHESION","score":0.10},
      {"id":"CIB.ACCOUNT.SIMILARITY","score":0.10},
      {"id":"CIB.CROSSPLATFORM.LINKAGE","score":0.10}
    ],
    "evidence": { "ids": ["EV-CIB-001"] },
    "context": { "run_type": "pr" }
  }
}

test_allows_low_risk_with_evidence {
  allow with input as {
    "signals": [
      {"id":"CIB.TEMPORAL.SYNC","score":0.10},
      {"id":"CIB.TEXT.REUSE","score":0.10},
      {"id":"CIB.URL.REUSE","score":0.10},
      {"id":"CIB.NETWORK.COHESION","score":0.10},
      {"id":"CIB.ACCOUNT.SIMILARITY","score":0.10},
      {"id":"CIB.CROSSPLATFORM.LINKAGE","score":0.10}
    ],
    "evidence": { "ids": ["EV-CIB-001","EV-CIB-002","EV-CIB-004","EV-XPLAT-001","EV-EXP-001"] },
    "context": { "run_type": "pr" }
  }
}

test_blocks_high_risk_release {
  not allow with input as {
    "signals": [
      {"id":"CIB.TEMPORAL.SYNC","score":0.95},
      {"id":"CIB.TEXT.REUSE","score":0.90},
      {"id":"CIB.URL.REUSE","score":0.90},
      {"id":"CIB.NETWORK.COHESION","score":0.95},
      {"id":"CIB.ACCOUNT.SIMILARITY","score":0.80},
      {"id":"CIB.CROSSPLATFORM.LINKAGE","score":0.90}
    ],
    "evidence": { "ids": ["EV-CIB-001","EV-CIB-002","EV-CIB-004","EV-XPLAT-001","EV-EXP-001"] },
    "context": { "run_type": "release" }
  }
}
