import json

import httpx
import pytest

from maestro_sdk.csiks import CsiksClient, CsiksError, IssueRequest, VerifyRequest


@pytest.mark.asyncio
async def test_issue_key_serializes_payload() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        data = json.loads(request.content.decode())
        assert data['tenant'] == 't'
        assert data['ttl_seconds'] == 60
        return httpx.Response(
            200,
            json={
                'idempotency_key': 'abc',
                'expires_at': '2024-01-01T00:00:00Z',
                'status': 'pending',
            },
        )

    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient(transport=transport, base_url='http://localhost')
    client = CsiksClient('http://localhost', client=async_client)

    response = await client.issue_key(
        IssueRequest(tenant='t', action='a', resource='r', ttl_seconds=60, issued_by='issuer')
    )

    assert response.idempotency_key == 'abc'
    assert response.status == 'pending'
    await client.aclose()


@pytest.mark.asyncio
async def test_verify_key_conflict_raises_error() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(409, json={'error': 'conflict: fingerprint mismatch'})

    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient(transport=transport, base_url='http://localhost')
    client = CsiksClient('http://localhost', client=async_client)

    with pytest.raises(CsiksError) as exc:
        await client.verify_key(
            VerifyRequest(
                tenant='t',
                action='a',
                resource='r',
                idempotency_key='key',
                fingerprint='a',
            )
        )

    assert exc.value.status_code == 409
    assert 'fingerprint mismatch' in str(exc.value)
    await client.aclose()
