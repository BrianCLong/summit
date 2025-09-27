import httpx
import pytest

from maestro_sdk.policy import PolicyClient, PolicyDecision


def make_transport(response):
    def handler(request: httpx.Request) -> httpx.Response:
        return response

    return httpx.MockTransport(handler)


def test_policy_client_evaluate_allow():
    response = httpx.Response(200, json={'result': {'allow': True, 'reason': 'authorized'}})
    client = PolicyClient('http://opa.local', transport=make_transport(response))
    decision = client.evaluate(subject={}, resource={}, action='read', context={})
    assert decision == PolicyDecision(allow=True, reason='authorized')
    client.close()


def test_policy_client_http_error():
    response = httpx.Response(403, text='deny')
    client = PolicyClient('http://opa.local', transport=make_transport(response))
    with pytest.raises(httpx.HTTPStatusError):
        client.evaluate(subject={}, resource={}, action='read', context={})
    client.close()


def test_policy_client_invalid_payload():
    response = httpx.Response(200, json={'unexpected': True})
    client = PolicyClient('http://opa.local', transport=make_transport(response))
    with pytest.raises(ValueError):
        client.evaluate(subject={}, resource={}, action='read', context={})
    client.close()


@pytest.mark.asyncio
async def test_policy_client_async():
    response = httpx.Response(200, json={'result': {'allow': False, 'reason': 'invalid-purpose'}})
    client = PolicyClient('http://opa.local', transport=make_transport(response))
    decision = await client.evaluate_async(subject={}, resource={}, action='write', context={})
    assert decision == PolicyDecision(allow=False, reason='invalid-purpose')
    await client.aclose()
