"""ASGI middleware enforcing consent receipt presence."""

from __future__ import annotations

import json
from typing import Any, Awaitable, Callable, Dict

from .verifier import ConsentVerifier

ASGISend = Callable[[Dict[str, Any]], Awaitable[None]]
ASGIReceive = Callable[[], Awaitable[Dict[str, Any]]]
ASGIApp = Callable[[Dict[str, Any], ASGIReceive, ASGISend], Awaitable[None]]


class ConsentPresentMiddleware:
    """ASGI middleware that rejects requests without a valid consent receipt."""

    def __init__(
        self,
        app: ASGIApp,
        verifier: ConsentVerifier,
        *,
        header: str = "x-consent-receipt",
    ) -> None:
        self.app = app
        self.verifier = verifier
        self.header = header.lower()

    async def __call__(self, scope: Dict[str, Any], receive: ASGIReceive, send: ASGISend) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        header_value = _extract_header(scope, self.header)
        if not header_value:
            await _forbidden(send, "Consent receipt required")
            return

        try:
            receipt = json.loads(header_value)
        except json.JSONDecodeError:
            await _forbidden(send, "Consent receipt header must be JSON")
            return

        result = await self.verifier.verify(receipt)
        if not result.verified:
            await _forbidden(send, result.reason or "Consent receipt invalid")
            return

        scope.setdefault("state", {})["consent_receipt"] = receipt
        await self.app(scope, receive, send)


def consent_present(
    verifier: ConsentVerifier,
    *,
    header: str = "x-consent-receipt",
) -> Callable[[ASGIApp], ASGIApp]:
    """Wrap an ASGI app to enforce consent receipts."""

    def wrapper(app: ASGIApp) -> ASGIApp:
        return ConsentPresentMiddleware(app, verifier, header=header)

    return wrapper


def _extract_header(scope: Dict[str, Any], header: str) -> str | None:
    headers = scope.get("headers") or []
    for key, value in headers:
        if isinstance(key, bytes) and key.decode("latin-1").lower() == header:
            return value.decode("latin-1") if isinstance(value, bytes) else value
    return None


def _forbidden(send: ASGISend, message: str) -> Awaitable[None]:
    body = json.dumps({"error": message}).encode("utf-8")

    async def responder() -> None:
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    return responder()
