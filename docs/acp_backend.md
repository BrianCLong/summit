# ACP Backend for Summit

This module implements the **Agent Client Protocol (ACP)** to use Copilot CLI as a backend agent runtime.

## Status: Preview (Disabled by default)

## Enablement

To enable the ACP backend, set `SUMMIT_ACP_ENABLE = True` in `summit/config/flags.py`.

## Architecture

* **Transport**: Stdio via NDJSON.
* **Protocol**: ACP (initialize, session, prompt, permissions).
* **Policy**: Deny-by-default permission broker.

## Security

* **Headless Mode**: Denies all tool execution and URL fetching by default.
* **Interactive Mode**: Requires allowlist for specific tools/URLs.

## Usage

(Coming soon)
