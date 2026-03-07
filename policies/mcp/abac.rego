package summit.mcp.authz

default allow = false

allow {
    input.tool_risk == "low"
    input.tenant_status == "active"
}

allow {
    input.tenant_id == "admin"
}

deny[reason] {
    input.tool_risk == "high"
    input.environment == "prod"
    not input.tenant_id == "admin"
    reason = "prod_write_block_test: unauthorized access to high risk tool in production"
}
