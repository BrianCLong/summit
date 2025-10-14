# ADR-0001: Adopt Golden Path Template for Platform Microservices

## Status
Accepted – 2026-02-20

## Context
Platform teams require a secure and repeatable starting point for services and scheduled jobs. Prior efforts relied on ad-hoc repositories with inconsistent CI/CD pipelines, unsigned images, and missing provenance metadata. Regulatory requirements now mandate cryptographic signing, SBOM distribution, and automated policy enforcement before production promotion.

## Decision
Create and maintain a paved-road template repository (`golden-path-platform`) containing:

- A Go-based `hello-service` HTTP API and `hello-job` worker with reproducible builds.
- Make/Task automation to orchestrate build, test, scan, signing, and deployment steps.
- Helm charts and environment overlays that encode immutable image tags, canary strategy, and configuration separation.
- GitHub Actions workflows that produce signed images, SPDX SBOMs, and SLSA provenance attestation while executing vulnerability, secret, and license scans.
- An OPA policy bundle that gates production releases based on signing and vulnerability thresholds.

## Consequences
- Platform onboarding is accelerated with secure defaults and documentation.
- CI/CD must keep action SHAs pinned and update them via regular dependency review.
- Teams adopting the template inherit cosign and SLSA workflows; they must provision registry credentials and OIDC trust relationships.
- Deviation from the template requires explicit ADRs and security review.
