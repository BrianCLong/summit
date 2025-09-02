### Context

Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`
Excerpt/why: Some tasks may require web browser automation to gather information or perform actions. This capability must be tightly controlled and sandboxed to prevent security vulnerabilities like Server-Side Request Forgery (SSRF) or access to internal resources.

### Problem / Goal

The system lacks a secure way to perform browser automation. A worker that can freely control a browser could be exploited to attack internal systems, access sensitive data, or perform malicious actions on the internet. The goal is to create a secure, sandboxed environment for browser automation using Playwright, with strong guardrails against common vulnerabilities.

### Proposed Approach

- Create a dedicated worker for browser automation based on Playwright.
- The worker will run in a tightly sandboxed environment (e.g., a container with no network access to internal resources).
- All outbound requests made by the browser will be routed through a proxy that enforces a strict allowlist of domains.
- The proxy will block access to link-local IP addresses, metadata services, and other internal endpoints.
- The worker will capture a HAR (HTTP Archive) file and screenshots for every action, which will be stored for auditing.
- The worker will have a limited set of allowed actions (e.g., `goto`, `click`, `screenshot`).

### Tasks

- [ ] Set up a sandboxed container environment for the Playwright worker.
- [ ] Implement the network proxy with an allowlist and blocklist.
- [ ] Integrate Playwright with the proxy.
- [ ] Implement HAR and screenshot capture for all browser actions.
- [ ] Define the contract for the browser automation worker, including the allowed actions.
- [ ] Add E2E tests that attempt to exploit SSRF and verify that it is blocked.

### Acceptance Criteria

- Given a request to access a blocked URL (e.g., a link-local IP), the worker denies the request and logs a security event.
- For every browser automation task, a HAR file and a series of screenshots are successfully captured and stored.
- The worker can successfully navigate to and interact with an allowed external website.
- Metrics/SLO: Browser automation task success rate > 95% for allowed sites.
- Tests: E2E tests for SSRF, DNS rebinding, and other common browser-based attacks.
- Observability: Logs for all browser actions, including the URL, action, and outcome.

### Safety & Policy

- Action class: READ (can also be WRITE if it performs actions on websites)
- OPA rule(s) evaluated: The domains that the browser can access must be controlled by a policy.

### Dependencies

- Depends on: #<id_of_worker_infra>
- Blocks: Any task that requires browser automation.

### DOR / DOD

- DOR: Sandbox design and network policy approved.
- DOD: Merged, E2E security tests are passing, runbook updated with browser automation guidelines.

### Links

- Code: `<path/to/workers/browser_automation>`
- Docs: `<link/to/security/policy>`
