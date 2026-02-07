package compliance
import future.keywords.if
import future.keywords.in

pass["sec-AUTHZ-001"]["Authorization decision logged with actor and resource"] {
  input.evidence.spec == "summit.evidence.authz.v1"
  input.evidence.decision != ""
  input.evidence.actor.id != ""
  input.evidence.resource.id != ""
}

fail["sec-AUTHZ-001"]["Authorization decision missing required fields"] {
  input.evidence.spec == "summit.evidence.authz.v1"
  input.evidence.actor.id == ""
}

fail["sec-AUTHZ-001"]["Authorization decision missing required fields"] {
  input.evidence.spec == "summit.evidence.authz.v1"
  input.evidence.resource.id == ""
}

pass["sec-ENC-001"]["Encryption at rest enabled for prod PII stores"] {
  input.evidence.spec == "summit.evidence.v1"
  input.evidence.event_type == "asset.snapshot"
  input.evidence.payload.asset.env == "prod"
  input.evidence.payload.asset.encryption_at_rest == true
}

fail["sec-ENC-001"]["Prod PII store missing encryption at rest"] {
  input.evidence.spec == "summit.evidence.v1"
  input.evidence.event_type == "asset.snapshot"
  input.evidence.payload.asset.env == "prod"
  input.evidence.payload.asset.encryption_at_rest != true
}
