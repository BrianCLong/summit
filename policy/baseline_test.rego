package baseline

test_secret_detection_deny if {
    deny["Secret detection: potential plaintext secret found"] with input as {"env": {"API_SECRET": "password123"}}
}

test_secret_detection_allow if {
    count(deny) == 0 with input as {"env": {"API_SECRET": "vault:my-secret"}, "security_headers": {"Content-Security-Policy": "default-src 'self'", "X-Frame-Options": "DENY", "Strict-Transport-Security": "max-age=63072000"}}
}

test_required_headers_deny if {
    deny["Security header missing: Strict-Transport-Security"] with input as {
        "security_headers": {
            "Content-Security-Policy": "default-src 'self'",
            "X-Frame-Options": "DENY"
        }
    }
}

test_pii_annotation_deny if {
    deny["PII field missing annotation: email"] with input as {
        "schema": {
            "fields": [
                {"name": "email", "is_pii": true}
            ]
        },
        "security_headers": {
            "Content-Security-Policy": "default-src 'self'",
            "X-Frame-Options": "DENY",
            "Strict-Transport-Security": "max-age=63072000"
        }
    }
}

test_unsigned_artifact_deny if {
    deny["Deployment blocked: artifact signature missing"] with input as {
        "deployment": {
            "target": "production",
            "artifact_signed": false
        },
        "security_headers": {
            "Content-Security-Policy": "default-src 'self'",
            "X-Frame-Options": "DENY",
            "Strict-Transport-Security": "max-age=63072000"
        }
    }
}
