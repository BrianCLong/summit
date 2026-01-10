# Extensions and Boundaries

This document clarifies the architectural boundaries of the Summit platform and the governance model for extending its core capabilities.

## Core Platform Boundaries

The Summit platform is designed with a clear set of certified capabilities, which are documented in the [Summit Readiness Assertion](./../SUMMIT_READINESS_ASSERTION.md). These core capabilities represent the supported and verified feature set of the platform.

Any functionality not explicitly mentioned in the readiness assertion is considered to be outside the core platform boundary.

## Intentionally Deferred Capabilities

To maintain a focused and secure platform, certain advanced capabilities are intentionally deferred to future releases. These are not supported in the current version and are disabled by configuration. As stated in the [Summit Readiness Assertion](./../SUMMIT_READINESS_ASSERTION.md), these include:

*   **Autonomous Agent Loop:** The "Agentic Mesh" is restricted to "Human-in-the-Loop" (HITL) mode. Full autonomy is not a supported configuration.
*   **Real-time Cognitive Warfare Defense:** The "PsyOps" defense module operates in a passive analysis mode only. Active countermeasures are disabled.
*   **Predictive Geopolitics:** The "Oracle" subsystem is limited to running on simulated historical data for calibration and is not intended for operational use.

## Extension Governance

At present, the Summit platform does not offer a public-facing extension or plugin API. All platform capabilities are developed and managed as part of the core product.

Any future extension model is designed to be subject to the same rigorous security, reliability, and governance standards as the core platform, including automated verification via our CI/CD pipeline.
