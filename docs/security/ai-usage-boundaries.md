# AI Usage Boundaries & Red Lines

This document defines the strict, non-negotiable boundaries for AI usage within the Summit platform. These policies are enforced at runtime via our architectural guardrails and are designed to ensure ethical, safe, and legally compliant deployment of AI capabilities.

## Enforcement Architecture

Our policy engine acts as a core module, not merely a contractual agreement. Every inference request is intercepted by policy guards at the API middleware layer (REST and GraphQL) and evaluated against defined inference profiles before reaching the orchestration layer.

## Hard-Coded Red Lines

The following activities are strictly prohibited under any circumstance, regardless of the tenant's configuration or inference profile. Any request classified as intending to perform these actions will be automatically denied, and the attempt will be permanently logged in the audit trail.

1.  **Autonomous Lethal Action**: Utilizing AI to independently identify, target, or engage human beings or critical infrastructure with lethal force.
2.  **Mass Surveillance**: Deploying AI systems for the indiscriminate, large-scale monitoring or tracking of populations without targeted, legally authorized rationale.
3.  **Unauthorized Biometric Identification**: Real-time or retroactive facial recognition or biometric identification of individuals in public spaces without explicit consent or strict legal mandate.
4.  **Social Scoring**: Generating or applying algorithmic scores that determine access to essential services, rights, or opportunities based on general behavior or personal characteristics.
5.  **Critical Infrastructure Disruption**: Attempting to use AI capabilities to compromise, degrade, or destroy critical civilian infrastructure (e.g., energy grids, water supplies, medical facilities).
6.  **CBRN Material Generation**: Assisting in the design, synthesis, or acquisition of Chemical, Biological, Radiological, or Nuclear materials.

## Inference Profiles

To support diverse enterprise needs while maintaining safety, Summit offers configurable inference profiles that dictate allowable use cases beyond the universal red lines.

*   **`civilian_safe`**: The default profile, optimized for general enterprise productivity. Allowed uses include general inquiry, content creation, data analysis, and software development.
*   **`defense_restricted`**: Available under strict, human-in-the-loop oversight for authorized government and defense contractors. Allowed uses include intelligence analysis, logistics planning, cyber defense simulation, and scenario modeling (expressly excluding autonomous lethal action).
*   **`research_unrestricted`**: Restricted to verified research environments for experimental models, unverified data processing, and synthetic data generation.

## Audit and Compliance

Every policy decision (allowed, denied, flagged) is cryptographically logged by the `auditEmitter`. These logs provide machine-verifiable proof of compliance and are exportable for regulatory review.
