import future.keywords
package container.policy

test_root_denied {
  deny contains "container runs as root"
  with input as {"image":{"user":"root","vulnerabilities":[]}}
}

test_critical_cve_denied {
  deny contains "critical CVE: CVE-2024-9999"
  with input as {"image":{"user":"nonroot","vulnerabilities":[{"id":"CVE-2024-9999","severity":"CRITICAL"}]}}
}
