# People Thrive Subsystem

This subsystem is designed to build software organisations where people can thrive, based on the principles of continuous learning, adaptability, support networks, and fair behavior standards.

## Architecture

- **Policies**: Located in `policies/people_thrive/`. Defines standards for behavior and incident workflows.
- **Evidence**: Located in `evidence/people_thrive/`. Stores machine-readable evidence of compliance and culture metrics.
- **Schemas**: Located in `schemas/people_thrive/`. Defines the structure of evidence and metric artifacts.
- **CI Verifiers**: Located in `ci/verifiers/people_thrive/`. Automated checks to ensure evidence integrity and PII protection.
- **Templates**: Located in `docs/people_thrive/templates/`. Scaffolding for 1:1s, resilience goals, and community playbooks.

## Getting Started

1. Review the [Controls](controls.md) to understand the underlying principles.
2. Use the [Templates](templates/) to integrate these practices into your team's workflow.
3. Ensure [Evidence](../../evidence/people_thrive/) is collected and validated by the CI pipeline.

## Governance

This subsystem follows the Summit GA readiness framework, requiring complete evidence bundles and passing PII guards for all releases.
