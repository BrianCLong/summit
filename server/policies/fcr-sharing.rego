package fcr.sharing

import future.keywords.in

default allow = false

allow {
  input.signal_type in {"claim", "media", "url", "account", "coordination_feature"}
  not input.raw_content
  not input.private_blob
}

redact_field[field] {
  field := "account_handle"
  input.signal_type == "account"
}
