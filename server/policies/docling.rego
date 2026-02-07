package docling
import future.keywords.in

import data.intelgraph.tenants

default allow = false

action := input.action

allow {
  action == "invoke"
  valid_retention
  valid_purpose
}

valid_retention {
  input.retention == "short"
}
valid_retention {
  input.retention == "standard"
}

valid_purpose {
  allowed := tenants[input.tenant_id].docling.allowed_purposes
  allowed[_] == input.purpose
}

# License enforcement - disallow copyleft licenses unless tenant explicitly allows
allow_license {
  input.action == "license_classify"
  not forbidden_license
}

forbidden_license {
  input.license_class in {"GPL-3.0", "AGPL-3.0", "LGPL-3.0"}
  not tenants[input.tenant_id].docling.permit_copyleft
}

# Retention mapping per purpose
retention_map["investigation"] = "short"
retention_map["compliance"] = "standard"
retention_map["release_notes"] = "standard"
retention_map["benchmarking"] = "short"
retention_map["t&s"] = "short"

allow_retention_override {
  input.action == "retention_check"
  expected := retention_map[input.purpose]
  input.retention == expected
}
