import pytest

from summit.psyche.policy import PolicyContext, PolicyDenied, enforce_policy


def test_policy_denies_disabled():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="document")
    with pytest.raises(PolicyDenied, match="PSYCHE_DISABLED"):
        enforce_policy(ctx, {"PSYCHE_ENABLED": False})

def test_policy_denies_person_scope_by_default():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="person")
    flags = {"PSYCHE_ENABLED": True}
    with pytest.raises(PolicyDenied, match="PERSON_SCOPE_DENIED"):
        enforce_policy(ctx, flags)

def test_policy_allows_person_scope_if_flagged():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="person", consent_assertion="agreed")
    flags = {"PSYCHE_ENABLED": True, "PSYCHE_ALLOW_PERSON_SCOPE": True}
    enforce_policy(ctx, flags)

def test_policy_denies_biometric_by_default():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="document", contains_biometric=True)
    flags = {"PSYCHE_ENABLED": True}
    with pytest.raises(PolicyDenied, match="BIOMETRIC_DENIED"):
        enforce_policy(ctx, flags)

def test_policy_denies_targeting():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="document")
    flags = {"PSYCHE_ENABLED": True, "PSYCHE_ALLOW_TARGETING": True}
    with pytest.raises(PolicyDenied, match="TARGETING_NOT_SUPPORTED"):
        enforce_policy(ctx, flags)

def test_policy_denies_bad_purpose():
    # Type checker might complain but we want to test runtime enforcement
    ctx = PolicyContext(purpose="marketing", subject_scope="document") # type: ignore
    flags = {"PSYCHE_ENABLED": True}
    with pytest.raises(PolicyDenied, match="PURPOSE_DENIED"):
        enforce_policy(ctx, flags)

def test_policy_denies_pii_without_consent():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="document", contains_pii=True, consent_assertion=None)
    flags = {"PSYCHE_ENABLED": True}
    with pytest.raises(PolicyDenied, match="PII_REQUIRES_CONSENT_ASSERTION"):
        enforce_policy(ctx, flags)

def test_policy_allows_valid_case():
    ctx = PolicyContext(purpose="situational_awareness", subject_scope="cohort", contains_pii=False)
    flags = {"PSYCHE_ENABLED": True}
    enforce_policy(ctx, flags)
