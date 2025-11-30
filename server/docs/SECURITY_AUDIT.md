# Security Audit: Rate Limiting

This document outlines the rate-limiting strategy implemented in the application to protect against brute-force attacks, denial-of-service attempts, and other forms of abuse.

## Strategy

The rate-limiting strategy is divided into two main tiers:

1.  **Public Rate Limiting**: This tier is applied to all public-facing endpoints that do not require authentication, such as health checks. It uses IP-based rate limiting to prevent abuse from a single source.
2.  **Authenticated Rate Limiting**: This tier is applied to all endpoints that require authentication. It uses user-based rate limiting, which is more lenient than the public tier but still protects against abuse from a single authenticated user.

## Implementation

The rate-limiting middleware is implemented in `server/src/middleware/rateLimiter.ts` and uses the `express-rate-limit` library.

### Public Rate Limiting

-   **Limit**: 100 requests per IP address per 15 minutes.
-   **Applied to**: All routes in `server/src/routes/public.ts`, which currently includes the health check endpoints.

### Authenticated Rate Limiting

-   **Limit**: 1000 requests per user per 15 minutes.
-   **Applied to**: All routes that require authentication.

## Protection Against Common Threats

-   **Brute-Force Attacks**: The public rate limit on endpoints like login and registration (when they are added) will slow down attackers trying to guess user credentials.
-   **Denial-of-Service (DoS) Attacks**: The rate limits on all endpoints help to mitigate DoS attacks by limiting the number of requests a single IP address or user can make in a given time period.
-   **API Abuse**: The authenticated rate limit prevents a single user from overwhelming the system with an excessive number of requests.
