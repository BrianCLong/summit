package baseline

import future.keywords.if
import future.keywords.in

# 1. No plaintext secrets (simulated check on input data)
deny["Secret detection: potential plaintext secret found"] if {
    some key, value in input.env
    contains(lower(key), "secret")
    not startswith(value, "vault:")
}

# 2. Required security headers
required_headers := ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security"]

deny[msg] if {
    some header in required_headers
    not input.security_headers[header]
    msg := sprintf("Security header missing: %s", [header])
}

# 3. PII fields must be annotated
deny[msg] if {
    some field in input.schema.fields
    field.is_pii
    not field.annotation
    msg := sprintf("PII field missing annotation: %s", [field.name])
}

# 4. No unsigned artifacts to deploy
deny["Deployment blocked: artifact signature missing"] if {
    input.deployment.target == "production"
    not input.deployment.artifact_signed
}
