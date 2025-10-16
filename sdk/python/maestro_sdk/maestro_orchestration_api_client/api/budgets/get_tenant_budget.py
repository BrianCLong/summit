from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.budget import Budget
from ...types import UNSET, Response


def _get_kwargs(
    *,
    tenant: str,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["tenant"] = tenant

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/budgets/tenant",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Budget | None:
    if response.status_code == 200:
        response_200 = Budget.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Budget]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    tenant: str,
) -> Response[Budget]:
    """Get a tenant's budget details

    Args:
        tenant (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Budget]
    """

    kwargs = _get_kwargs(
        tenant=tenant,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    tenant: str,
) -> Budget | None:
    """Get a tenant's budget details

    Args:
        tenant (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Budget
    """

    return sync_detailed(
        client=client,
        tenant=tenant,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    tenant: str,
) -> Response[Budget]:
    """Get a tenant's budget details

    Args:
        tenant (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Budget]
    """

    kwargs = _get_kwargs(
        tenant=tenant,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    tenant: str,
) -> Budget | None:
    """Get a tenant's budget details

    Args:
        tenant (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Budget
    """

    return (
        await asyncio_detailed(
            client=client,
            tenant=tenant,
        )
    ).parsed
