# Agentic Web Visibility

This module allows Summit to track AI agent and bot behavior on brand sites.
It provides visibility into what agents are fetching, their paths, and potentially their success rates.

## Components

- **Collector**: Ingests events from various sources (CDN, middleware, etc.).
- **Privacy Gates**: Ensures sensitive data (PII, secrets) is never logged.
- **Metrics**: Derives visibility scores.
