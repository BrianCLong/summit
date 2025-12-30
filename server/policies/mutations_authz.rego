package intelgraph.mutations

import future.keywords.in

default allow = false
default reason = "role_not_allowed"

# Mapping between mutation ids and required role/action tuples
allowed_roles := {
  "aiExtractEntities": {"action": "execute", "roles": ["analyst", "admin"]},
  "aiResolveEntities": {"action": "execute", "roles": ["analyst", "admin"]},
  "aiLinkPredict": {"action": "execute", "roles": ["analyst", "admin"]},
  "aiCommunityDetect": {"action": "execute", "roles": ["analyst", "admin"]},
  "approveInsight": {"action": "approve", "roles": ["admin"]},
  "rejectInsight": {"action": "approve", "roles": ["admin"]},

  "createMLModel": {"action": "create", "roles": ["ml_admin", "admin"]},
  "trainMLModel": {"action": "execute", "roles": ["ml_admin", "ml_engineer", "admin"]},
  "runMLInference": {"action": "execute", "roles": ["ml_engineer", "analyst", "admin"]},
  "optimizeMLModel": {"action": "update", "roles": ["ml_admin", "admin"]},
  "runQuantumOptimization": {"action": "execute", "roles": ["researcher", "admin"]},
  "analyzeGraphWithML": {"action": "execute", "roles": ["analyst", "admin"]},
  "optimizeGraphWithQuantum": {"action": "execute", "roles": ["researcher", "admin"]},
  "deleteMLModel": {"action": "delete", "roles": ["ml_admin", "admin"]},

  "createWatchlist": {"action": "create", "roles": ["analyst", "admin"]},
  "addToWatchlist": {"action": "update", "roles": ["analyst", "admin"]},
  "removeFromWatchlist": {"action": "update", "roles": ["analyst", "admin"]},
  "importWatchlistCsv": {"action": "create", "roles": ["analyst", "admin"]},
  "exportWatchlistCsv": {"action": "execute", "roles": ["analyst", "admin"]},
  "deleteWatchlist": {"action": "delete", "roles": ["admin"]},

  "createCheckout": {"action": "create", "roles": ["billing_admin", "admin"]},

  "exportWithProvenance": {"action": "execute", "roles": ["analyst", "admin"]},

  "pqcGenerateKeyPair": {"action": "create", "roles": ["crypto_admin", "admin"]},
  "pqcGenerateHybridKeyPair": {"action": "create", "roles": ["crypto_admin", "admin"]},
  "pqcEncapsulate": {"action": "execute", "roles": ["crypto_admin", "admin"]},
  "pqcDecapsulate": {"action": "execute", "roles": ["crypto_admin", "admin"]},
  "pqcSign": {"action": "execute", "roles": ["crypto_admin", "admin"]},
  "pqcVerify": {"action": "execute", "roles": ["crypto_admin", "admin", "auditor"]},
  "pqcDeleteKey": {"action": "delete", "roles": ["crypto_admin", "admin"]},
  "pqcRotateKey": {"action": "update", "roles": ["crypto_admin", "admin"]},
  "pqcValidateAlgorithm": {"action": "execute", "roles": ["crypto_admin", "admin", "researcher"]},
  "pqcBenchmarkAlgorithm": {"action": "execute", "roles": ["crypto_admin", "admin", "researcher"]},
}

tenant_mismatch {
  input.resource.tenantId != input.actor.tenantId
}

allow {
  not tenant_mismatch
  entry := allowed_roles[input.resource.id]
  entry.action == input.action
  some role
  role := input.actor.roles[_]
  role in entry.roles
}

reason := "tenant_mismatch" {
  tenant_mismatch
}

reason := "unknown_mutation" {
  not allowed_roles[input.resource.id]
}

reason := "action_mismatch" {
  allowed_roles[input.resource.id]
  allowed_roles[input.resource.id].action != input.action
}

reason := "role_not_allowed" {
  allowed_roles[input.resource.id]
  allowed_roles[input.resource.id].action == input.action
  not allow
}

obligations := []

decision := {
  "allow": allow,
  "reason": reason,
  "obligations": obligations,
}
