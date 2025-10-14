package cos.abac

default allow = false

# Subject: { tenant, environment, purpose, roles, expiry? }
# Resource: { tenant, environment, retention_until, labels }

allow {
  same_tenant
  env_scope
  purpose_allowed
  not expired
}

same_tenant { input.subject.tenant == input.resource.tenant }

env_scope {
  # read-only for prod unless role has "governor"
  input.resource.environment == "prod"
  input.input_action == "read"
}

env_scope {
  input.resource.environment != "prod"
}

purpose_allowed { input.subject.purpose == "investigation" }
purpose_allowed { input.subject.purpose == "fraud-risk" }
purpose_allowed { input.subject.purpose == "t&s" }

expired {
  ts := time.now_ns()
  until := time.parse_rfc3339_ns(input.resource.retention_until)
  ts > until
}

not expired {
  not expired
}

