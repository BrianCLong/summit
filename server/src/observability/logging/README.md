# Observability Logging

This module provides standards and utilities for structured logging.

## Log Field Contract

All logs should adhere to the `LogSchema` defined in `schema.ts`.
Core fields:
- `level`: severity
- `message`: human readable description
- `correlationId`: for tracing across services

## Redaction

Use `redact(obj)` from `redaction.ts` to sanitize objects before logging if not using the built-in logger redaction.
Sensitive keys include `password`, `token`, `secret`, etc.

## Middleware

The correlation ID middleware ensures every request has a unique ID propagated to logs.
