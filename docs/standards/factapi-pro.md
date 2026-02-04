# FactAPI Pro Standards

## Overview

FactAPI Pro is a partner-safe verification API surface.

## Interfaces

| Interface | Direction | Format | Notes |
| :--- | ---: | :--- | :--- |
| `/v1/verify` HTTP | Export | JSON | sync verification request/response |
| `/v1/verify/async` | Export | JSON | returns job id (Planned) |
| Webhooks `/v1/webhooks/*` | Import | JSON | signature-verified events (Planned) |
| OpenAPI spec | Export | YAML | source-of-truth schema |
| SDKs | Export | JS/Python | generated from OpenAPI |

## Auth & Security

*   **Auth**: API Key via `X-API-Key` header.
*   **Policy**: Deny-by-default.
*   **Logging**: Never log `Authorization` headers or raw API keys.

## Metering & Quotas

*   **Unit**: Verification Call.
*   **Artifacts**: `report.json`, `metrics.json`, `stamp.json` (Deterministic).
