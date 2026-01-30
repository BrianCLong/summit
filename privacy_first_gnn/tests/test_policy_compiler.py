from privacy_first_gnn.policy.compiler import PrivacyPolicyCompiler, apply_policy


def test_policy_compiler():
    classifications = {
        "src_ip": "SENSITIVE",
        "user_name": "PII",
        "device_id": "PUBLIC"
    }

    compiler = PrivacyPolicyCompiler(classifications)
    rules = compiler.compile()

    assert "src_ip" in rules["must_encrypt"]
    assert "user_name" in rules["must_mask"]
    assert "device_id" in rules["allow_plaintext"]

    data = {
        "src_ip": "1.2.3.4",
        "user_name": "Alice",
        "device_id": "dev-001"
    }

    processed = apply_policy(data, rules)

    assert processed["src_ip"].startswith("ENFORCED_ENCRYPTION")
    assert processed["user_name"] == "****"
    assert processed["device_id"] == "dev-001"
