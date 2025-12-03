package summit.provenance

import data.summit.provenance

test_valid_deploy_prov {
  provenance.valid with input as {
    "id": "prov_1",
    "timestamp": "2025-12-03T12:00:00Z",
    "actor": {"type": "service", "id": "deploy-bot", "roles": ["governance-bot"]},
    "action": "deploy",
    "subject": {"type": "artifact", "id": "api:1.2.3"},
    "context": {"commit": "abcd", "env": "prod"}
  }
}

test_invalid_orphan_deploy_prov {
  not provenance.valid with input as {
    "id": "prov_2",
    "timestamp": "2025-12-03T12:00:00Z",
    "actor": {"type": "service", "id": "deploy-bot", "roles": ["governance-bot"]},
    "action": "deploy",
    "subject": {"type": "artifact", "id": "api:1.2.3"},
    "context": {"env": "prod"}
  }
}
