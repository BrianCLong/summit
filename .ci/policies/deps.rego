package deps

import future.keywords.if

allowed_override(pkg) {
  policy := input.policy.allow.overrides[_]
  pkg.name == policy.name
  pkg.version == policy.version
  parsed := time.parse_rfc3339(policy.expires)
  now := time.now_ns()
  parsed*1000000 > now
}

license_denied(pkg) {
  pkg.license != null
  policy := input.policy.deny.licenses[_]
  pkg.license == policy
}

package_denied(pkg) {
  policy := input.policy.deny.packages[_]
  pkg.name == policy.name
  not allowed_override(pkg)
  (policy.version == null) or (pkg.version == policy.version)
}

cve_denied(pkg) {
  vuln := pkg.vulnerabilities[_]
  policy := input.policy.deny.cves[_]
  vuln.id == policy
  not allowed_override(pkg)
}

deny[msg] {
  pkg := input.sbom.packages[_]
  license_denied(pkg)
  msg := sprintf("license %s is denied for %s", [pkg.license, pkg.name])
}

deny[msg] {
  pkg := input.sbom.packages[_]
  package_denied(pkg)
  ver := ""
  pkg.version != null
  ver := sprintf(" version %s", [pkg.version])
  msg := sprintf("package %s denied%s", [pkg.name, ver])
}

deny[msg] {
  pkg := input.sbom.packages[_]
  cve_denied(pkg)
  msg := sprintf("package %s contains denied vulnerability", [pkg.name])
}

warn[msg] {
  pkg := input.sbom.packages[_]
  allowed_override(pkg)
  override := input.policy.allow.overrides[_]
  override.name == pkg.name
  override.version == pkg.version
  msg := sprintf("override applied for %s %s (ticket %s)", [pkg.name, pkg.version, override.ticket])
}
