package deps.policy

import future.keywords.if
import future.keywords.in

policy := data.policy

licenses(pkg) = result {
  raw := [pkg.licenseConcluded, pkg.licenseDeclared][_]
  raw != null
  raw != ""
  lowered := lower(raw)
  cleaned := regex.replace(lowered, "[()]", "")
  tokens := split(replace(replace(cleaned, " and ", " | "), " or ", " | "), "|")
  result := {trim_space(token) | token := tokens[_]; trim_space(token) != ""}
}

licenses(pkg) = {} {
  not pkg.licenseConcluded
  not pkg.licenseDeclared
}

version_matches(_, pat) {
  not pat
}

version_matches(_, pat) {
  pat == ""
}

version_matches(version, pat) {
  pat != ""
  version != null
  regex.match(pat, sprintf("%v", [version]))
}

override_metadata_valid(override) {
  override.ticket
  trim_space(override.ticket) != ""
  override.justification
  trim_space(override.justification) != ""
  not expired(override.expires)
}

allow_override(pkg, rule) {
  some override in policy.allow_overrides
  override_metadata_valid(override)
  override["package"] == pkg.name
  version_matches(pkg.versionInfo, override.version_regex)
  rule_is_covered(rule, override)
}

rule_is_covered(rule, override) {
  not rule.cve
  not override.cve
}

rule_is_covered(rule, override) {
  rule.cve
  override.cve == rule.cve
}

expired(ts) {
  ts == null
}

expired(ts) {
  ts == ""
}

expired(ts) {
  parsed := time.parse_rfc3339_ns(ts)
  now := time.now_ns()
  parsed <= now
}

not_expired(ts) {
  not expired(ts)
}

violation[msg] {
  override := policy.allow_overrides[_]
  not override_metadata_valid(override)
  msg := sprintf("override for %s missing required metadata (ticket/justification) or expired", [override["package"]])
}

violation[msg] {
  pkg := input.packages[_]
  disallowed := policy.disallowed_licenses[_]
  license := licenses(pkg)[_]
  lower(disallowed) == license
  not allow_override(pkg, {"license": disallowed})
  msg := sprintf("disallowed license %s on %s@%s", [disallowed, pkg.name, pkg.versionInfo])
}

violation[msg] {
  pkg := input.packages[_]
  entry := policy.denylist.packages[_]
  pkg.name == entry.name
  version_matches(pkg.versionInfo, entry.version_regex)
  not allow_override(pkg, entry)
  msg := sprintf("dependency %s@%s blocked: %s", [pkg.name, pkg.versionInfo, entry.reason])
}

violation[msg] {
  pkg := input.packages[_]
  entry := policy.denylist.cves[_]
  pkg.name == entry["package"]
  version_matches(pkg.versionInfo, entry.version_regex)
  not allow_override(pkg, entry)
  msg := sprintf("dependency %s@%s blocked for %s: %s", [pkg.name, pkg.versionInfo, entry.id, entry.reason])
}
