package summit.mcp.authz.test

import data.summit.mcp.authz

test_allow_admin {
    authz.allow with input as {"tenant_id": "admin", "tool_risk": "high", "environment": "prod"}
}

test_deny_high_risk_prod {
    not authz.allow with input as {"tenant_id": "user", "tool_risk": "high", "environment": "prod"}
}

test_allow_low_risk {
    authz.allow with input as {"tenant_id": "user", "tool_risk": "low", "environment": "prod", "tenant_status": "active"}
}
