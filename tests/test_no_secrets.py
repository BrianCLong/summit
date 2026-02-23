import pytest

from modules.k8s.onboarding import K8sAuth, redact_secrets


def test_secrets_are_redacted():
    auth = K8sAuth(kubeconfig_b64="secret", token="secret_token", endpoint="https://k8s.example.com")

    # Verify strict redaction function
    assert redact_secrets(auth.kubeconfig_b64) == "<redacted>"
    assert redact_secrets(auth.token) == "<redacted>"

    # Ensure the function works generally
    assert redact_secrets("any_string") == "<redacted>"

def test_auth_object_creation():
    auth = K8sAuth(kubeconfig_b64="conf", token="tok", endpoint="url")
    assert auth.kubeconfig_b64 == "conf"
    assert auth.token == "tok"
