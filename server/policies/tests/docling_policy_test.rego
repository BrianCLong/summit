import future.keywords
package docling_test

import data.docling

allow_invoke_when_purpose_allowed {
  allow := docling.allow
    with input as {
      "action": "invoke",
      "tenant_id": "tenant-a",
      "purpose": "investigation",
      "retention": "short"
    }
    with data.intelgraph.tenants as {"tenant-a": {"docling": {"allowed_purposes": ["investigation"], "permit_copyleft": false}}}
  allow
}

deny_invoke_when_retention_invalid {
  not docling.allow
    with input as {
      "action": "invoke",
      "tenant_id": "tenant-a",
      "purpose": "investigation",
      "retention": "long"
    }
    with data.intelgraph.tenants as {"tenant-a": {"docling": {"allowed_purposes": ["investigation"], "permit_copyleft": false}}}
}

block_copyleft_license_when_not_permitted {
  not docling.allow_license
    with input as {
      "action": "license_classify",
      "tenant_id": "tenant-a",
      "license_class": "GPL-3.0"
    }
    with data.intelgraph.tenants as {"tenant-a": {"docling": {"allowed_purposes": ["investigation"], "permit_copyleft": false}}}
}
