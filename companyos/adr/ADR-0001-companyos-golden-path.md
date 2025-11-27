# ADR-0001: CompanyOS Golden Path Alignment

## Context

CompanyOS must operate within Summit's existing delivery workflows so teams can reuse the same tooling, observability, and operational practices.

## Decision

Establish a CompanyOS-specific golden path that mirrors Summit's: `make companyos-bootstrap`, `make companyos-up`, and `make companyos-smoke`. These commands install dependencies, start CompanyOS services via Docker Compose, and perform a health-based smoke test.

## Status

Accepted

## Consequences

- Team members can onboard CompanyOS without learning a new workflow.
- CI pipelines can reuse Summit patterns while targeting CompanyOS services.
- Dockerized local environments remain isolated from the main Summit stack while sharing platform conventions.
