# Code Signing Policy

## Overview
This policy defines the requirements and procedures for signing Summit platform releases to ensure authenticity, integrity, and non-repudiation.

## Signing Requirements
- **Production Releases:** All binaries, Docker images, and release bundles intended for production must be digitally signed.
- **Git Tags:** All release tags must be GPG-signed by an authorized maintainer.
- **Artifacts:** CI-generated artifacts (SBOMs, Attestations) must be signed using the project's OIDC-backed identity.

## Key Management
- **Private Keys:** Must never be stored in plain text or committed to the repository.
- **Hardware Security Modules (HSM):** Where possible, keys should reside in an HSM or a secure cloud equivalent (e.g., AWS KMS, GitHub Actions OIDC).
- **Rotation:** Signing keys should be rotated annually or immediately upon suspected compromise.

## Tools and Implementation
- **Cosign:** Used for signing and verifying container images.
- **GPG:** Used for signing Git commits and tags.
- **Sigstore:** Used for keyless signing and transparency logging for CI-driven releases.

## Verification
Users and automated systems should verify signatures before deployment:
- Verify container images: `cosign verify <image-uri>`
- Verify Git tags: `git tag -v <tag-name>`

## Enforcement
Releases that do not meet these code-signing requirements will be rejected by the production deployment gateway.
