import json
from pathlib import Path
import pytest
from summit_ext.cosmos_subsumption.policy.model import ExposureRule, AuthPolicy
from summit_ext.cosmos_subsumption.policy.eval import validate, PolicyError

FIX = Path("summit_ext/cosmos_subsumption/policy/fixtures")

def test_negative_public_no_auth_fails():
    obj = json.loads((FIX / "negative_public_no_auth.json").read_text())
    rule = ExposureRule(
        app_id=obj["app_id"],
        exposure=obj["exposure"],
        domain=obj["domain"],
        auth=AuthPolicy(required=obj["auth"]["required"], provider=obj["auth"].get("provider")),
        breakglass=obj.get("breakglass", False),
    )
    with pytest.raises(PolicyError, match="public exposure without auth requires breakglass=true"):
        validate(rule)

def test_positive_public_with_auth_passes():
    obj = json.loads((FIX / "positive_public_with_auth.json").read_text())
    rule = ExposureRule(
        app_id=obj["app_id"],
        exposure=obj["exposure"],
        domain=obj["domain"],
        auth=AuthPolicy(required=obj["auth"]["required"], provider=obj["auth"].get("provider")),
        breakglass=obj.get("breakglass", False),
    )
    validate(rule)  # Should not raise

def test_internet_requires_domain():
    rule = ExposureRule(app_id="app", exposure="internet", domain=None)
    with pytest.raises(PolicyError, match="internet exposure requires domain"):
        validate(rule)

def test_breakglass_allows_public_no_auth():
    rule = ExposureRule(
        app_id="app",
        exposure="internet",
        domain="test.com",
        auth=AuthPolicy(required=False),
        breakglass=True
    )
    validate(rule)  # Should pass because breakglass is True
