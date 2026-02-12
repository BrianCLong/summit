import future.keywords

package intelgraph.dlp
default allow := true
pattern := {"ssn": `\b\d{3}-\d{2}-\d{4}\b`, "cc": `\b4[0-9]{12}(?:[0-9]{3})?\b`, "api": `(?i)api[_-]?key\s*[:=]\s*[A-Za-z0-9_\-]{16,}`}

deny[msg] {
  input.action == "export"
  some k, re
  re := pattern[k]
  re_match(re, input.payload)
  msg := sprintf("dlp.%s", [k])
}

allow { not deny[_] }
