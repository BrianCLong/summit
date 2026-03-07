# Maestro Build Orchestrator

> **🎯 Maestro is the conductor that orchestrates the building of IntelGraph. It is separate from IntelGraph itself.**

## What is Maestro?

Maestro is a standalone build orchestration platform that coordinates the construction, testing, and deployment of IntelGraph through intelligent automation. It integrates with AI models (LiteLLM, Ollama), web scraping, APIs, developer tools (IDE, CLI), and CI/CD systems to create reproducible, observable build processes.

### Key Distinction

- **Maestro**: The build conductor (this project)
- **IntelGraph**: The intelligence analysis product being built by Maestro

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Maestro Control Plane                    │
├─────────────────────────────────────────────────────────────────┤
│ Orchestration API │ Policy Engine │ Artifact Store │ Provenance │
├─────────────────────────────────────────────────────────────────┤
│                      Execution Runners                         │
├─────────────────────────────────────────────────────────────────┤
│ LiteLLM │ Ollama │ Web Scrape │ API │ IDE │ CLI │ CI/CD │ Build │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IntelGraph Product                        │
│              (Target of Maestro's Build Process)               │
└─────────────────────────────────────────────────────────────────┘
```

## Core Capabilities

### 🤖 AI-Powered Workflows

- **LiteLLM Integration**: Multi-provider routing with cost optimization
- **Ollama Local Models**: GPU-aware scheduling with fallback chains
- **Prompt Templates**: Versioned, policy-gated prompt execution

### 🌐 Data Acquisition

- **Web Scraping**: Robots.txt compliant, rate-limited, proxy-rotated
- **API Integration**: Schema-aware clients with retry/backoff
- **Content Processing**: HTML→Markdown, document parsing, normalization

### 👨‍💻 Developer Experience

- **IDE Extensions**: VS Code integration with pipeline authoring
- **CLI Tools**: Local development parity with remote execution
- **Templates**: Quickstart blueprints for common workflows

### 🔄 CI/CD Integration

- **GitHub Actions**: Native integration with status checks
- **Artifact Management**: Content-addressable storage with provenance
- **Deployment Gates**: Policy-enforced promotion workflows

### 🔒 Security & Governance

- **Policy Engine**: OPA/ABAC with explainable denials
- **Secrets Management**: KMS integration with rotation
- **Supply Chain**: SBOM generation, image signing, attestations

### 📊 Observability

- **Distributed Tracing**: End-to-end visibility across workflows
- **Cost Attribution**: Per-tenant, per-workflow cost tracking
- **SLO Monitoring**: Availability, latency, and success metrics

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Kubernetes access
- Redis and PostgreSQL for state management

### Quick Start

```bash
# Install Maestro CLI
npm install -g @intelgraph/maestro

# Initialize a new workflow
maestro init --template intelgraph-build

# Plan the workflow
maestro plan --pipeline maestro.yaml

# Execute locally
maestro run --local

# Deploy to cluster
maestro deploy --env staging
```

### Example Workflow

```yaml
# maestro.yaml
name: intelgraph-build
version: 1.0.0

stages:
  - name: analyze
    steps:
      - run: litellm.generate
        with:
          prompt_template: code_review
          model: gpt-4o-mini

  - name: build
    steps:
      - run: build.typescript
        with:
          cache_key: "{{ git.sha }}-{{ package.json.hash }}"

  - name: test
    parallel:
      - run: test.unit
      - run: test.integration
      - run: test.e2e

  - name: package
    steps:
      - run: container.build
        with:
          registry: ghcr.io/intelgraph
          sbom: true
          sign: true
```

## Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Security Model](./SECURITY.md)
- [Operator Runbooks](./runbooks/)
- [Plugin Development](./SDK.md)
- [Policy Reference](./POLICIES.md)

## Repository Structure

```
maestro/
├── packages/
│   ├── core/           # Orchestration engine
│   ├── cli/            # Command-line interface
│   ├── plugins/        # Built-in step plugins
│   └── sdk/            # Plugin development SDK
├── apps/
│   ├── api/            # REST API server
│   ├── ui/             # Web console
│   └── workers/        # Background job processors
├── charts/             # Helm deployment charts
├── docs/               # Documentation
└── examples/           # Sample workflows
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

## License

Licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

**⚠️ Important**: Maestro builds IntelGraph but is not part of IntelGraph's runtime. They are separate systems with different lifecycles, deployments, and responsibilities.
