# Platform Self-Service

## 1. Purpose

This document outlines the strategy for empowering developers with self-service capabilities, enabling them to efficiently manage their development environments, troubleshoot issues, and contribute to the platform's infrastructure.

## 2. Developer CLI for Ephemeral Environments

- **Strategy**: Provide a command-line interface (CLI) tool that allows developers to provision and manage ephemeral development environments on demand.
- **Capabilities**:
  - `intelgraph env create <pr-number>`: Provisions a new ephemeral environment for a given Pull Request, complete with seeded data.
  - `intelgraph env destroy <pr-number>`: Tears down an ephemeral environment.
  - `intelgraph env list`: Lists active ephemeral environments.
  - `intelgraph env connect <pr-number>`: Provides kubectl/Helm context to connect to the environment.
- **Implementation**:
  - Leverage existing IaC (Terraform, Helm) for environment provisioning.
  - Integrate with CI/CD pipelines to trigger environment creation/destruction.
  - Implement data seeding mechanisms to populate environments with relevant test data.

## 3. One-Click Log/Metrics/Traces Bundle Collection

- **Strategy**: Enable developers to easily collect diagnostic bundles (logs, metrics, traces) for specific services or requests to aid in bug reporting and troubleshooting.
- **Capabilities**:
  - `intelgraph diagnose <service-name>`: Collects logs, metrics, and traces for a specific service.
  - `intelgraph diagnose --request-id <id>`: Collects diagnostic data related to a specific request ID (leveraging distributed tracing).
  - `intelgraph diagnose --time-range <start> <end>`: Collects data within a specified time range.
- **Implementation**:
  - Integrate with observability tools (Prometheus, Grafana, ELK/OpenSearch, Jaeger/Tempo) to export data.
  - Bundle collected data into a downloadable archive.
  - Provide a secure mechanism for sharing bundles (e.g., temporary S3 link).

## 4. Documentation and Training for Helm/Terraform Workflows

- **Strategy**: Provide comprehensive documentation and training to enable developers to understand and contribute to Helm charts and Terraform configurations.
- **Documentation Topics**:
  - Helm chart structure and best practices.
  - Terraform module development and consumption.
  - IaC testing and validation.
  - Deployment pipelines and GitOps workflows.
  - Troubleshooting common infrastructure issues.
- **Training Formats**:
  - Workshops and hands-on labs.
  - Internal knowledge base articles.
  - Code examples and templates.
