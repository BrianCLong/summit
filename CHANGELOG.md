# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-07

### Added
- Security enhancements including Sigstore verifier hardening (PR #18157)
- LUSPO performance benchmarks and length drift detection (PR #18161)
- Enhanced error handling for DIU CADDS connector (PR #18162)
- Configuration validation and dependency checks (PR #18163)
- Knowledge graph and analytics capabilities
- Agent runtime with decision-making capabilities
- MCP (Model Context Protocol) integration
- AI/ML and reinforcement learning components
- Governance and compliance frameworks
- Full observability stack (metrics, tracing, logging)
- System integration and validation tests

### Changed
- Updated security scanning to include version pinning
- Improved evidence system with deterministic processing
- Enhanced CLI tools with redaction and hash chaining
- Optimized connector error handling

### Fixed
- Missing jsonschema dependency issue (PR #18161)
- CI lockfile synchronization (PR #18163)
- XSS vulnerabilities in connector processing (PR #18162)
- PII exposure in data processing (PR #18162)

### Security
- Implemented Sigstore verifier hardening with version pinning
- Added dependency vulnerability scanning
- Enhanced XSS prevention measures
- Implemented PII redaction capabilities
