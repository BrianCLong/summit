import future.keywords.in
import future.keywords.if
package summit.sbom

default allow := false

#
# Input shape (CycloneDX-ish):
# {
#   "sbom": {
#     "packages": [
#       {
#         "name": "lodash",
#         "version": "4.17.21",
#         "license": "MIT",
#         "vuln": {
#           "id": "CVE-XXXX-YYYY",
#           "severity": "high"
#         }
#       }
#     ]
#   }
# }
#

# ---- VULNERABILITY POLICY ----

no_critical_vulns if {
  not exists_critical_vuln
}

exists_critical_vuln if {
  pkg := input.sbom.packages[_]
  pkg.vuln.severity == "critical"
}

# ---- LICENSE POLICY ----

no_disallowed_licenses if {
  not exists_disallowed_license
}

disallowed_licenses := {
  "GPL-3.0",
  "AGPL-3.0",
}

exists_disallowed_license if {
  pkg := input.sbom.packages[_]
  pkg.license != ""
  disallowed_licenses[pkg.license]
}

# ---- DECISION ----

allow if {
  no_critical_vulns
  no_disallowed_licenses
}
