# ADR-045: CSP & Trusted Types Adoption

**Status:** Proposed

## Context

To mitigate Cross-Site Scripting (XSS) attacks, we must implement a strict Content Security Policy (CSP) and adopt Trusted Types where browser support allows.

## Decision

1.  **CSP Implementation**: We will implement a strict, nonce-based CSP. All inline scripts and styles must have a unique `nonce` attribute that matches the one specified in the `Content-Security-Policy` header. `unsafe-inline` and `unsafe-eval` will be removed.

2.  **Trusted Types**: For browsers that support it, we will enable Trusted Types. This will require us to create policies for sanitizing HTML, scripts, and URLs before they are injected into the DOM. We will use a library like `DOMPurify` to create these policies.

3.  **Rollout Strategy**:
    - **Phase 1 (Report-Only)**: Deploy the CSP in `Content-Security-Policy-Report-Only` mode to collect violation reports without breaking the application.
    - **Phase 2 (Enforcement)**: Once violations are addressed, move the policy to `Content-Security-Policy` to actively block violations.
    - This will be controlled by a feature flag (`FEATURE_CSP_TT`).

## Consequences

- **Pros**: Drastically reduces the risk of XSS attacks. Enforces cleaner separation of code and content.
- **Cons**: Requires careful implementation and testing to avoid breaking legitimate application features. Can add complexity to third-party script integrations.
