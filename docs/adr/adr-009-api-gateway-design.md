# ADR 009: API Gateway Design

## Status
Accepted

## Context
Summit requires a secure, highly-available entry point to route external requests to internal microservices, handle authentication (JWT validation), enforce rate limits, and provide robust Web Application Firewall (WAF) capabilities. The gateway must unify multiple APIs (e.g., GraphQL for the primary frontend and REST for legacy/administrative interfaces).

## Decision
We will implement an API Gateway using Envoy combined with WAF functionality, positioned at the edge of the service mesh.

1.  **Ingress and TLS:** The Gateway will act as the primary ingress point and terminate TLS connections.
2.  **Authentication & Authorization:** The Gateway will validate tenant-scoped JWTs (e.g., via WorkOS integration), enforcing "Wall 2: Identity" before any traffic reaches internal services.
3.  **Traffic Routing:** The Gateway will handle GraphQL Federation, routing requests to the appropriate Graph Core or other underlying services (e.g., NLP Service, Analytics Engine).
4.  **Resiliency:** The gateway will implement circuit breaking, retries (e.g., 3 retries, 3s timeout), and consistent hashing on user IDs for sticky session requirements.
5.  **Security:** The WAF will inspect incoming traffic for malicious payloads and anomalies, providing a "blast radius" barrier that can auto-scale or circuit-break affected regions during high-severity (SEV-1) incidents.

## Consequences
- **Positive:** Centralizes security controls (TLS, WAF, JWT validation) and unburdens backend microservices from implementing complex authentication checks.
- **Positive:** Enables intelligent routing and GraphQL federation, simplifying frontend client architecture.
- **Positive:** Improves overall system resiliency through centralized rate limiting, retries, and circuit breakers.
- **Negative:** Introduces a single point of failure (though mitigated by deploying the gateway in a highly available, scaled-out configuration).
- **Negative:** Adds a network hop to all external requests, marginally increasing baseline latency.
