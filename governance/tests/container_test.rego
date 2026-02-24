package container.policy

test_root_denied {
  some msg
  deny[msg] with input as {"image":{"user":"root","vulnerabilities":[]}}
  msg == "container runs as root"
}

test_critical_cve_denied {
  some msg
  deny[msg] with input as {"image":{"user":"nonroot","vulnerabilities":[{"id":"CVE-2024-9999","severity":"CRITICAL"}]}}
  msg == "critical CVE: CVE-2024-9999"
}
