# API Changelog

All notable changes to the Summit API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated OpenAPI 3.1 spec generation.
- Interactive API documentation via Swagger UI at `/api-docs`.
- SDK generation pipeline using `openapi-generator-cli`.
- API Design Guidelines.
- Documentation for:
    - Authentication Endpoints (`/auth/*`)
    - Health Check Endpoints (`/health/*`)
    - Maestro Orchestration Endpoints (`/api/maestro/*`)

### Changed
- Standardized API versioning middleware (`x-ig-api-version`).

## [1.0.0] - 2024-01-01
### Initial Release
- Basic REST and GraphQL APIs.
