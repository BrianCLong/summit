package tenant.bundle

import rego.v1

test_cross_tenant_denied_by_default if {
    result := data.tenant.bundle.decision with input as {
        "subject_tenant": "tenant-a",
        "resource_tenant": "tenant-b",
        "overlays_applied": []
    }
    result.allow == false
    result.reason == "cross_tenant_denied"
}

test_overlay_override_respected if {
    result := data.tenant.bundle.decision with input as {
        "subject_tenant": "tenant-a",
        "resource_tenant": "tenant-b",
        "overlays_applied": [
            {
                "id": "mission-exception",
                "effect": "allow_cross_tenant"
            }
        ]
    }
    result.allow == true
    result.reason == "overlay_override"
}
