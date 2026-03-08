import json
import os

import pytest

from summit.policy.gates.dep_delta_enforced import check as dep_delta_check
from summit.policy.gates.no_unsupported_fields import check as unsupported_check
from summit.policy.gates.pii_redaction_gate import check as pii_check
from summit.policy.gates.provenance_required import check as provenance_check
from summit.policy.gates.trust_tier_policy import check as trust_tier_check


def load(filename):
    path = os.path.join(os.path.dirname(__file__), "fixtures", filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def test_provenance_pass():
    profile = load("mitstartups2026_article_only.json")
    ok, errs = provenance_check(profile)
    assert ok, f"Expected pass, got {errs}"

def test_provenance_fail():
    profile = load("fail_missing_provenance.json")
    ok, errs = provenance_check(profile)
    assert not ok
    assert len(errs) > 0

def test_unsupported_fields_fail():
    profile = load("fail_invented_funding.json")
    ok, errs = unsupported_check(profile)
    assert not ok
    assert "funding_raised" in str(errs)

def test_pii_check_pass():
    profile = load("mitstartups2026_article_only.json")
    ok, errs = pii_check(profile)
    assert ok, errs

def test_pii_check_fail():
    profile = {"email": "REDACTED"}
    ok, errs = pii_check(profile)
    assert not ok
    assert "email" in str(errs)

def test_dep_delta_enforced():
    # Pass
    ok, errs = dep_delta_check(["README.md"])
    assert ok
    ok, errs = dep_delta_check(["package-lock.json", "docs/dependency_delta.md"])
    assert ok

    # Fail
    ok, errs = dep_delta_check(["package-lock.json"])
    assert not ok
    assert "dependency_delta.md" in str(errs)
