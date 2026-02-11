import future.keywords
package container.policy

# Deny root containers.
deny[msg] {
  input.image.user == "root"
  msg := "container runs as root"
}

# Deny critical vulnerabilities (demo input format).
deny[msg] {
  some i
  vuln := input.image.vulnerabilities[i]
  vuln.severity == "CRITICAL"
  msg := sprintf("critical CVE: %s", [vuln.id])
}
