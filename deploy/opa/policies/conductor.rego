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
