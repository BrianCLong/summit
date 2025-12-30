# Egress Receipts and Network Accounting

## Purpose

Provide tamper-evident accounting of network egress for sandboxed modules, enabling enforcement of passive-only policies and auditability.

## Components

- **Egress policy**: Allowed endpoint classes, HTTP methods, byte and rate limits; defaults to passive-only until authorized.
- **Sandbox monitoring**: Intercepts DNS/HTTP/TCP events and records categorized byte counts and destinations.
- **Receipt format**: Hash-chain commitment over egress events, category labels, byte counts, and halt events.
- **Compliance decision**: Evaluate receipts against policy; produce decision identifiers bound to subject context and purpose.

## Operational guidance

- Emit **replay tokens** with module version sets and time windows.
- Store receipt digests in **transparency logs** for independent verification.
- Maintain module reputation scores derived from historical receipts to tune sandbox strictness.
