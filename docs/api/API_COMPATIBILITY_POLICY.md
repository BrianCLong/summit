# API Compatibility Policy (v4)

This document defines the policy for backward compatibility for the GA API surfaces enumerated in `GA_API_SURFACES.md`. The primary goal is to ensure that future changes do not silently break consumers who rely on the GA contract.

The "Golden Rule" of v4 API compatibility is: **A change is backward-compatible if, and only if, the `make smoke` command continues to pass.**

---

## 1. Defining a Breaking Change

A **breaking change** is any modification to the codebase that causes the `make smoke` command or its constituent parts (e.g., `make dev-smoke`, `npm run test:quick`) to fail in a clean, correctly configured environment.

Examples of breaking changes include:

*   **Removing an Endpoint**: Deleting any of the HTTP or GraphQL endpoints listed in `GA_API_SURFACES.md`.
*   **Changing Paths or Ports**: Modifying the URL, port, or path of a GA endpoint.
*   **Altering HTTP Methods**: Changing the required HTTP verb for an endpoint (e.g., changing a `GET` to a `POST`).
*   **Restricting Access**: Adding new required headers, authentication, or authorization that prevents the smoke test from accessing a health check.
*   **Modifying Success Criteria**: Changing an endpoint's response code for a successful health check from `2xx` to something else.
*   **Altering GraphQL Introspection**: Changing the GraphQL schema in a way that the `{ __typename }` introspection query no longer returns `{"data":{"__typename":"Query"}}`.
*   **CLI Command Changes**: Renaming or removing the `make smoke`, `make dev-smoke`, or `npm run test:quick` commands, or altering their fundamental behavior.

## 2. Allowed Non-Breaking Changes

A **non-breaking change** is a modification that is additive and does not cause the `make smoke` command to fail.

Examples of allowed non-breaking changes include:

*   **Adding New Endpoints**: Introducing new, non-GA API endpoints.
*   **Adding Optional Fields**: Appending new, optional fields to the JSON response of a health check. The smoke test does not parse the response body, so this is considered safe.
*   **Adding Fields to GraphQL Schema**: Appending new types, queries, or mutations to the GraphQL schema is acceptable as long as it does not break the basic introspection query.
*   **Improving Performance**: Changes that improve the latency or reliability of an endpoint without altering its contract.
*   **Refactoring Implementation**: Rewriting the internal logic of a health check endpoint, provided its external contract (path, method, response code) remains unchanged.

## 3. Deprecation Policy

No endpoint or command listed in `GA_API_SURFACES.md` may be removed or undergo a breaking change without a formal deprecation process.

The process is as follows:

1.  **Proposal**: A proposal to deprecate a GA surface must be written and approved by the project's technical steering committee.
2.  **Warning Period**: Once approved, the change will be announced in the release notes. The affected endpoint or command will be marked as "deprecated" but will continue to function for a minimum of one major release cycle.
3.  **Removal**: After the warning period, the deprecated surface can be removed in the next major version.

## 4. Policy Enforcement

This policy is enforced programmatically by the `make smoke` command within the project's CI/CD pipeline. A failure in this command on a pull request is considered a breaking change and must be remediated before the PR can be merged.

---
