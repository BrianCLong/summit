import future.keywords
package conductor

default allow = true

tenant_isolation := result {
  input := input
  result := {
    "allow": true,
    "reason": "tenant isolation OK",
    "warnings": [],
    "data_filters": {
      "tenant_scope": [input.input.tenantId]
    }
  }
}

data_access := result {
  result := {"allow": true, "reason": "data access OK"}
}

cross_tenant := result {
  result := {"allow": false, "reason": "cross-tenant blocked by default"}
}

tenant_config := {
  "default": {
    "tenantId": "default",
    "isolationLevel": "strict",
    "allowedCrossTenantActions": [],
    "dataClassification": "internal",
    "retentionPolicy": {"defaultRetentionDays": 365, "categories": {}},
    "auditRequirements": {"logAllActions": true, "logDataAccess": true, "realTimeAlerting": false}
  }
}


# Pipeline hints policy: emits conditions based on pipeline spec
pipeline_hints := result {
  nodes := input.input.pipeline.nodes
  conds := []
  count(nodes) > 8
  conds := array.concat(conds, ["Pipeline has more than 8 nodes; consider splitting into stages"])
  result := {"allow": true, "conditions": conds}
}

pipeline_hints := result {
  nodes := input.input.pipeline.nodes
  some i
  n := nodes[i]
  n.type == "llm"
  n.temperature > 0.7
  result := {"allow": true, "conditions": ["LLM temperature > 0.7; reduce for determinism in CI"]}
}

pipeline_hints := result {
  nodes := input.input.pipeline.nodes
  some i
  n := nodes[i]
  n.type == "shell"
  result := {"allow": true, "conditions": ["Shell step detected; ensure least-privilege and sandboxing"]}
}
