package public_evidence.redaction

import future.keywords.every

default allow = false

allowed_badge_keys = {
  "schemaVersion",
  "label",
  "message",
  "color",
  "labelColor",
  "style",
  "logo",
  "logoColor",
  "namedLogo",
  "cacheSeconds",
}

allowed_summary_keys = {
  "schemaVersion",
  "commit",
  "sbom",
  "attestation",
  "verification",
}

url_denylist = [
  "localhost",
  "127.0.0.1",
  "github.com",
]

allow {
  badge_ok
  summary_ok
  no_private_urls
}

badge_ok {
  every key in input.badge {
    key in allowed_badge_keys
  }
}

summary_ok {
  every key in input.summary {
    key in allowed_summary_keys
  }
}

no_private_urls {
  not contains_private_url
}

contains_private_url {
  some path, value
  value := walk_string(input)[path]
  some deny in url_denylist
  contains(lower(value), deny)
}

walk_string(input) = result {
  result := {path: value |
    [path, value] := walk(input)
    is_string(value)
  }
}
