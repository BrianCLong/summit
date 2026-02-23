from summit.policy.router import route_request, RoutingDecision

def test_route_preference_foundry():
    req = {"preferred_provider": "azure-foundry", "model": "gpt-4"}
    ctx = {}
    decision = route_request(req, ctx)
    assert decision.provider_id == "azure-foundry"
    assert decision.reason == "user_preference"
    assert decision.fallback_provider_id == "openai"

def test_route_implication_azure():
    req = {"model": "azure-gpt-4"}
    ctx = {}
    decision = route_request(req, ctx)
    assert decision.provider_id == "azure-foundry"
    assert decision.reason == "model_name_implication"

def test_route_default():
    req = {"model": "gpt-4"}
    ctx = {}
    decision = route_request(req, ctx)
    assert decision.provider_id == "openai"
    assert decision.reason == "default"
