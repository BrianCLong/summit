# Changelog

All notable changes to the Data Quality Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-20

### Added
- Initial release of Data Quality Service
- REST API for data quality operations
- Quality assessment endpoints
  - POST /api/v1/quality/assess - Run comprehensive quality assessment
  - GET /api/v1/quality/score/:datasetId - Get quality score
  - GET /api/v1/quality/scores - List quality scores
  - GET /api/v1/quality/dashboard/:datasetId - Get quality dashboard
  - GET /api/v1/quality/trends/:datasetId - Get quality trends
  - GET /api/v1/quality/dimensions/:datasetId - Get quality dimensions
- Data profiling endpoints
  - POST /api/v1/profiling/profile - Profile dataset
  - POST /api/v1/profiling/column - Profile specific column
  - GET /api/v1/profiling/statistics/:tableName/:columnName - Get statistics
  - GET /api/v1/profiling/distribution/:tableName/:columnName - Get distribution
  - GET /api/v1/profiling/patterns/:tableName/:columnName - Detect patterns
  - GET /api/v1/profiling/nulls/:tableName - Analyze null values
  - POST /api/v1/profiling/duplicates/:tableName - Find duplicates
  - POST /api/v1/profiling/correlations/:tableName - Calculate correlations
- Data validation endpoints
  - POST /api/v1/validation/rules - Register validation rule
  - GET /api/v1/validation/rules - List rules
  - DELETE /api/v1/validation/rules/:ruleId - Remove rule
  - POST /api/v1/validation/validate - Validate dataset
  - POST /api/v1/validation/validate-column - Validate column
  - POST /api/v1/validation/check-completeness - Check completeness
  - POST /api/v1/validation/check-consistency - Check consistency
  - POST /api/v1/validation/check-uniqueness - Check uniqueness
  - POST /api/v1/validation/check-referential-integrity - Check referential integrity
  - GET /api/v1/validation/results/:validationId - Get validation results
- Data remediation endpoints
  - POST /api/v1/remediation/plan - Create remediation plan
  - POST /api/v1/remediation/execute - Execute remediation
  - POST /api/v1/remediation/cleanse - Cleanse data
  - POST /api/v1/remediation/standardize - Standardize data
  - POST /api/v1/remediation/deduplicate - Deduplicate records
  - POST /api/v1/remediation/impute - Impute missing values
  - POST /api/v1/remediation/quarantine - Quarantine records
  - GET /api/v1/remediation/history/:datasetId - Get remediation history
  - POST /api/v1/remediation/rollback/:remediationId - Rollback remediation
  - POST /api/v1/remediation/preview - Preview remediation
- Health check endpoints
  - GET /health - Health check with database connectivity
  - GET /ready - Readiness probe
  - GET /live - Liveness probe
- Swagger/OpenAPI documentation at /api-docs
- Express-based REST API server
- PostgreSQL connection pooling
- Request validation with express-validator
- Rate limiting protection
- CORS support
- Helmet security headers
- Comprehensive error handling
- JSON logging with Pino
- TypeScript with strict mode
- Docker support with multi-stage builds
- Docker Compose configuration
- Kubernetes deployment manifests
- Horizontal Pod Autoscaler configuration
- Pod Disruption Budget
- Ingress configuration
- Jest testing framework
- ESLint configuration
- Environment-based configuration
- Authentication middleware stub

### Security
- Security headers with Helmet
- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- Non-root Docker container
- Read-only root filesystem in Kubernetes
- Dropped Linux capabilities
- HTTPS enforcement in production

[Unreleased]: https://github.com/summit/summit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/summit/summit/releases/tag/v1.0.0
