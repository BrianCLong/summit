# IntelGraph CI Governance

This document outlines the CI/CD governance policies, standards, and best practices for the IntelGraph platform. All services and applications must comply with these requirements to ensure security, quality, and maintainability.

## Overview

IntelGraph's CI governance framework ensures:
- **Security**: All code is scanned for vulnerabilities and secrets
- **Quality**: Code meets coverage and complexity standards
- **Consistency**: Standardized CI processes across all services
- **Compliance**: Adherence to security and regulatory requirements

## CI Baseline Template

All services must use the standardized CI baseline template located at `.github/workflows/templates/ci-baseline.yml`.

### Required Workflow Structure

```yaml
name: <Service Name> CI

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'services/<service-name>/**'
      - '.github/workflows/<service-name>-ci.yml'
  push:
    branches: [main, develop]
    paths:
      - 'services/<service-name>/**'

jobs:
  ci:
    uses: ./.github/workflows/templates/ci-baseline.yml
    with:
      service_name: <service-name>
      service_path: services/<service-name>
      # Additional configuration...
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Required Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `service_name` | ✅ | - | Name of the service |
| `service_path` | ✅ | - | Path to service directory |
| `node_version` | ❌ | `18` | Node.js version |
| `python_version` | ❌ | `3.11` | Python version |
| `requires_database` | ❌ | `false` | Requires PostgreSQL |
| `requires_neo4j` | ❌ | `false` | Requires Neo4j |
| `coverage_threshold` | ❌ | `80` | Minimum coverage % |

## CI Pipeline Phases

### Phase 1: Fast Feedback (< 5 minutes)
- **Linting**: ESLint, Prettier, Black, flake8
- **Format Check**: Code formatting validation
- **Commit Message**: Conventional commits validation

### Phase 2: Type Checking and Build (< 10 minutes)
- **Type Check**: TypeScript, MyPy validation
- **Build**: Application compilation and bundling
- **Artifact Upload**: Build artifacts for downstream jobs

### Phase 3: Testing (< 20 minutes)
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service integration testing
- **Coverage Analysis**: Code coverage measurement
- **Database Tests**: Database-dependent tests

### Phase 4: Security Scanning (< 15 minutes)
- **Vulnerability Scan**: Trivy, npm audit, safety
- **Secret Scan**: TruffleHog secret detection
- **Container Scan**: Docker image security (if applicable)
- **Dependency Audit**: Third-party dependency security

### Phase 5: Quality Analysis (< 10 minutes)
- **SonarCloud**: Code quality and security analysis
- **Complexity Analysis**: Cyclomatic complexity checks
- **Maintainability**: Code maintainability metrics

### Phase 6: Policy Compliance (< 5 minutes)
- **Governance Check**: OPA policy validation
- **Required Files**: README, license, security files
- **Naming Conventions**: Service and file naming standards

## Service Requirements

### Required Files

Every service must include:

```
service-name/
├── README.md                 # Service documentation
├── package.json             # Node.js metadata and scripts
├── .gitignore              # Git ignore patterns
├── Dockerfile              # Container definition (if applicable)
├── src/                    # Source code
├── tests/                  # Test files
└── docs/                   # Additional documentation
```

### Package.json Requirements

```json
{
  "name": "@intelgraph/service-name",
  "version": "1.0.0",
  "description": "Brief service description",
  "author": "IntelGraph Team",
  "license": "Proprietary",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    // Production dependencies
  },
  "devDependencies": {
    // Development dependencies
  }
}
```

### Security Dependencies

#### API Services
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting
- `express-validator`: Input validation

#### Web Applications
- Security headers configuration
- Content Security Policy (CSP)
- HTTPS enforcement

#### Gateway Services
- Rate limiting and circuit breakers
- Request/response validation
- Authentication middleware

## Quality Standards

### Code Coverage
- **Minimum**: 80% overall coverage
- **API Services**: 85% minimum
- **Gateway Services**: 90% minimum
- **Web Applications**: 75% minimum

### Code Quality
- **Complexity**: Max 10 cyclomatic complexity
- **Maintainability**: SonarCloud maintainability rating A-B
- **Security**: No high/critical security issues
- **Reliability**: SonarCloud reliability rating A-B

### Testing Requirements
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Database migration tests (if applicable)

## Security Standards

### Vulnerability Management
- **Critical**: Must be fixed within 24 hours
- **High**: Must be fixed within 7 days
- **Medium**: Must be fixed within 30 days
- **Low**: Should be fixed within 90 days

### Secret Management
- No secrets in code or configuration files
- Use GitHub Secrets for sensitive data
- Environment-specific configuration
- Regular secret rotation

### Container Security
- Base images from approved registries
- Regular base image updates
- Minimal container privileges
- Non-root container execution

## Compliance Validation

### Automated Checks

The CI governance workflow validates:

```bash
# Run governance validation
.github/workflows/ci-governance.yml
```

### OPA Policy Validation

```bash
# Validate with Open Policy Agent
opa eval -d tools/ci/governance-policy.rego -i governance-input.json "data.intelgraph.ci.governance.allow"
```

### Manual Review Checklist

- [ ] Service follows naming conventions
- [ ] All required files present
- [ ] CI workflow uses baseline template
- [ ] Security scanning enabled
- [ ] Coverage meets thresholds
- [ ] No high-severity vulnerabilities
- [ ] Documentation is comprehensive

## Governance Workflow

### 1. Service Creation
1. Create service directory structure
2. Add required files (README, package.json, etc.)
3. Create CI workflow using baseline template
4. Implement initial tests and documentation
5. Run governance validation

### 2. CI Workflow Creation
```yaml
# .github/workflows/my-service-ci.yml
name: My Service CI

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'services/my-service/**'
      - '.github/workflows/my-service-ci.yml'
  push:
    branches: [main, develop]
    paths:
      - 'services/my-service/**'

jobs:
  ci:
    uses: ./.github/workflows/templates/ci-baseline.yml
    with:
      service_name: my-service
      service_path: services/my-service
      requires_database: true
      coverage_threshold: 85
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### 3. Validation and Approval
1. Automated governance checks run
2. Security team reviews security configurations
3. Architecture team reviews service design
4. DevOps team reviews CI/CD pipeline
5. Final approval and merge

## Monitoring and Reporting

### Weekly Governance Reports
- Service compliance status
- Security vulnerability summary
- Code quality metrics
- Coverage trends

### Dashboard Metrics
- Total services vs. compliant services
- Average code coverage
- Security scan results
- CI pipeline success rates

### Alerts and Notifications
- New high/critical vulnerabilities
- Coverage drops below threshold
- CI governance violations
- Policy compliance failures

## Exemptions and Waivers

### Exemption Process
1. Submit exemption request with justification
2. Security team review (for security exemptions)
3. Architecture team review (for quality exemptions)
4. Time-limited approval with remediation plan
5. Regular exemption review and renewal

### Valid Exemption Reasons
- Legacy system migration constraints
- Third-party integration limitations
- Performance critical optimizations
- Temporary technical debt with roadmap

## Tools and Resources

### CI/CD Tools
- **GitHub Actions**: CI/CD execution
- **OPA (Open Policy Agent)**: Policy validation
- **SonarCloud**: Code quality analysis
- **Codecov**: Coverage reporting

### Security Tools
- **Trivy**: Vulnerability scanning
- **TruffleHog**: Secret detection
- **npm audit / safety**: Dependency scanning
- **Dependabot**: Automated dependency updates

### Development Tools
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **TypeScript**: Type checking

## Getting Help

### Documentation
- [CI Baseline Template](/.github/workflows/templates/ci-baseline.yml)
- [Security Guidelines](/docs/security-guidelines.md)
- [Testing Standards](/docs/testing-standards.md)

### Support Channels
- **Slack**: #intelgraph-devops
- **Email**: devops@intelgraph.io
- **Issues**: GitHub Issues for policy feedback

### Training Resources
- CI/CD Best Practices Workshop
- Security Scanning Training
- OPA Policy Writing Guide
- Testing Strategy Workshop

## Changelog

### v1.0.0 (2024-01-15)
- Initial CI governance framework
- Baseline template implementation
- OPA policy definitions
- Security requirements specification

### v1.1.0 (TBD)
- Performance benchmarking integration
- Advanced security scanning
- Automated policy updates
- Enhanced reporting capabilities