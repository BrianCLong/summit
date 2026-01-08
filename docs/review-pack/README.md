# External Review Pack

Welcome to the Summit External Review Pack. This bundle contains all the necessary information for a third-party security or compliance assessor to quickly validate Summit’s GA (General Availability) gate, reliability enforcement, and controls-to-evidence traceability.

The goal of this pack is to provide a deterministic, reproducible, and time-efficient review process, achievable within a 60-90 minute timeframe.

## Getting Started

To begin your review, please follow these steps:

1.  **Understand the Scope**: Read `SCOPE.MD` to understand what is included in this review pack and what is considered out of scope.
2.  **Follow the Walkthrough**: `WALKTHROUGH.md` provides a step-by-step guide to verifying the key claims and controls. This is the primary document to follow for the assessment.
3.  **Use the Fast Path (Optional)**: If you have limited time, `EVIDENCE_SAMPLING.md` provides a "fast path" to verify the integrity of this bundle and sample key evidence in under 15 minutes.

## Key Documents

*   **`WALKTHROUGH.md`**: The main script for your review.
*   **`EVIDENCE_SAMPLING.md`**: A condensed version for quick checks.
*   **`SCOPE.MD`**: Defines the boundaries of this review.
*   **`THREAT_MODEL_DELTA.md`**: Highlights the specific threats and mitigations relevant to this review.
*   **`CONTROLS_HIGHLIGHTS.md`**: A quick-reference guide to the most important controls.
*   **`manifest.json`**: A machine-readable file containing the commit SHA, generation date, and file hashes to verify the integrity of this bundle.

## Integrity Verification

Before you begin, please verify the integrity of this review pack by running `shasum -a 256 ./*` from the root of this directory and comparing the output with the `sha256` hashes in `manifest.json`.
