# Memory Distillation Job

This module implements a nightly job responsible for memory distillation with robust privacy controls.

## Purpose:
To process and distill conversational state into structured, purpose-tagged facts before committing them to long-term memory. This process ensures that only relevant and policy-compliant information is retained.

## Key Features:
-   **Purpose-Tagged Facts**: Extracts and tags facts from conversations based on their intended use or context.
-   **K-Anonymity Thresholds**: Applies k-anonymity techniques to anonymize sensitive data, ensuring that individual identities cannot be easily re-identified within the stored facts. This helps in meeting privacy requirements (e.g., k ≥ 10 default).
-   **Retention Tiering**: Implements data retention policies by assigning different tiers to distilled facts, dictating how long they should be stored based on their sensitivity and purpose.
-   **Scheduled Execution**: Designed to run as a nightly job, processing accumulated conversational data efficiently.

This job is crucial for maintaining privacy by design in the agent's memory architecture and adhering to data governance policies.
