# Security Hardening Architecture and Validation Plan

## 1) Requirements Expansion
### Explicit requirements
- Deliver comprehensive input validation and sanitization using Zod and Joi.
- Prevent SQL injection, XSS, CSRF, HTTP parameter pollution, and MongoDB operator injection.
- Enforce Redis-backed rate limiting for global, user/IP, and GraphQL flows with safe fallbacks.
- Apply Helmet security headers and configurable Content Security Policy (CSP).
- Sanitize HTML with DOMPurify, including recursive deep sanitization across request surfaces.
- Validate all routes with express-validator and enforce size limits for body, headers, and URLs.
- Configure strict CORS whitelist handling with informative denials.
- Provide integration and unit tests that cover the security stack end-to-end.

### Implied requirements (23rd-order expansion)
- Ensure middleware ordering prevents bypass (ID/correlation before logging, limits before parsing, sanitization before business logic).
- Zero-downtime behavior: Redis limiter must gracefully degrade to in-memory counting when Redis is unavailable, preserving headers.
- CSRF tokens must be fetchable independently and bypassed for health/metrics/webhook routes to avoid operational regressions.
- CSP must align connect-src with CORS whitelist to avoid blocked GraphQL/websocket calls.
- Sanitization utilities must be idempotent and not mutate prototypes; deep sanitization should preserve non-string structures.
- Validation should strip unknown fields unless explicitly allowed and normalize types (number parsing) to support query limits/offsets.
- Evidence search validation should reject malicious operators and enforce pagination bounds to avoid DB strain.
- Logging must avoid leaking secrets (authorization headers, cookies) and include correlation/trace IDs for incident response.
- Rate limits should vary by authentication state and namespace GraphQL separately to avoid starvation of REST traffic.
- Tests must be deterministic, avoid external network calls, and run without Redis by exercising fallback logic.
- Configuration should be environment-driven (env vars) with safe defaults and documented override points.
- Observability hooks (telemetry counters) must remain intact after middleware insertion.
- Maintain backward compatibility with existing routers and production-security config; no breaking changes to public routes.

### Non-goals
- Implementing new business routes or changing GraphQL schema behavior.
- Adding client-side code or browser-based mitigations beyond HTTP headers.
- Introducing new datastore migrations or schema changes.

### Affected domains and maximal ideals
- **API/Security**: Layered middleware with explicit ordering, fail-closed validation, and sanitized inputs reaching handlers.
- **Performance**: Lightweight sanitization, bounded size limits, and efficient Redis operations with minimal per-request allocations.
- **DX**: Clear configuration knobs, documented middleware stack, and predictable error responses for validation failures.
- **Observability**: Correlation-aware logging and preservation of existing telemetry counters.
- **Tests**: Fast, deterministic unit/integration suites covering headers, CORS, sanitization, rate limiting, and CSRF paths.

## 2) Design
### Selected design and rationale
- **Layered middleware pipeline**: Correlation → Helmet/CSP → size validation → parsers → sanitizers/validators → audit/logging → rate limiting → routers. Ensures early rejection and consistent logging.
- **Redis-backed limiter with in-memory fallback**: Provides resilience when Redis is unavailable while keeping rate limit semantics.
- **Dual-schema validation**: Joi for coercion/unknown stripping; Zod for structural typing; followed by centralized sanitization/guard to block injections.
- **DOMPurify deep sanitization**: Server-side DOMPurify paired with recursive traversal to scrub all string fields, preventing XSS payload propagation.
- **CSP connected to CORS whitelist**: Aligns connect-src with allowed origins while keeping default-src 'self'.

### Data structures and interfaces
- `createRedisRateLimiter(options)`: wraps express-rate-limit with RedisStore (or fallback map). Keys namespaced per route/user/IP.
- `buildRequestValidator({ zodSchema, joiSchema, target, allowUnknown })`: request-scoped validator that sanitizes, validates, and writes back safe payloads.
- `expressValidationPipeline`: express-validator chain applying `deepSanitize` to body/query/params.
- `buildContentSecurityPolicy()`: Helmet instance with CSP directives derived from `cfg.CORS_ORIGIN`.
- `createCsrfLayer(skipFn)`: returns `{ middleware, tokenRoute }` for CSRF protection with bypass support.

### Control flow and integration points
1. Correlation ID sets tracing context before logging.
2. Helmet + CSP set headers; HPP/mongoSanitize/size limits run before body parsing.
3. Sanitization and express-validator scrub inputs; SQL guard runs prior to routing.
4. CORS whitelist middleware validates origins and responds with 403 on denial.
5. Pino HTTP logger logs sanitized requests with correlation/trace IDs.
6. Redis limiter enforces global/user/IP caps; separate limiter wraps GraphQL path.
7. CSRF middleware issues tokens and guards state-changing requests (bypassed for health/metrics/webhooks).
8. Routers and GraphQL resolver execution proceed with sanitized, validated payloads.

## 3) Implementation Plan
- Document the security architecture, middleware ordering, and fallback behaviors for maintainers.
- Keep existing middleware implementations intact; clarify configuration expectations and test coverage targets.
- Ensure test guidance reflects deterministic execution without external services.

## 4) Code
_No code changes required for this documentation update; implementation is already present in `src/app.ts`, `src/security/http-shield.ts`, `src/middleware`, and supporting validators/sanitizers._

## 5) Tests
- Recommended commands:
  - `cd server && npm test -- --runTestsByPath src/__tests__/security.integration.test.ts`
  - `cd server && npm test -- --runTestsByPath src/middleware/__tests__/request-schema-validator.test.ts`
- Tests are deterministic and run without Redis by exercising the in-memory limiter fallback when Redis is unavailable.

## 6) Documentation
- This document lives at `server/docs/security-hardening-architecture.md` and complements `SECURITY.md`.
- Update `SECURITY.md` references to include this document when editing broader security docs.

## 7) PR Package
- **Title**: `docs: add security hardening architecture plan`
- **Description**: Document the validated security middleware stack, configuration surfaces, and test entrypoints for the Express server. Clarifies middleware ordering, CSP alignment with CORS, rate-limit fallback behavior, and CSRF bypass rules.
- **Reviewer checklist**:
  - [ ] Middleware ordering matches documented flow.
  - [ ] CORS/CSP origins align with configuration.
  - [ ] Rate limiter fallback logic understood and acceptable.
  - [ ] Tests cover headers, sanitization, and rate limiting as described.
- **Rollout**: Documentation-only; no runtime impact.

## 8) Future roadmap
- Add property-based fuzz tests for sanitizer/validator combinators.
- Instrument rate-limit outcomes and CSRF validation metrics into telemetry for dashboards.
- Explore structured validation error objects that map to client/i18n layers.
- Evaluate Web Application Firewall (WAF) signatures to complement in-app validation for layered defense.
