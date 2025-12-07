# CompanyOS Simulation & What-If Engine v0

## Mission
Build the capability to safely simulate changes and incidents: "what-if" scenarios for policies, config, workloads, and failures—without touching production.

## 1. Simulation Model

The Simulation Engine supports four primary types of operational "what-if" scenarios:

### 1.1 Types of Simulations

*   **Policy Changes (`POLICY_CHANGE`):**
    *   **Question:** "What happens if I apply this new strict OPA policy?"
    *   **Mechanism:** Replay recent traffic (or a sample set) against a shadow OPA instance loaded with the new policy.
    *   **Metrics:** Valid requests blocked (false positives), Invalid requests allowed (false negatives), Policy evaluation latency.

*   **Configuration/Flag Changes (`CONFIG_CHANGE`):**
    *   **Question:** "What happens if I enable the 'Dual-Write' feature flag?"
    *   **Mechanism:** Spin up a sandboxed instance of the service with the flag enabled. Route shadowed traffic to it.
    *   **Metrics:** Latency impact, Error rate, Resource usage (CPU/Memory).

*   **Deployment Impacts (`DEPLOYMENT_IMPACT`):**
    *   **Question:** "Is this new build safe to deploy?"
    *   **Mechanism:** "Virtual Canary" – deploying the new version in an ephemeral sandbox and subjecting it to synthetic or mirrored load.
    *   **Metrics:** Regression testing, Startup time, Health check stability.

*   **Incident Replays (`INCIDENT_REPLAY`):**
    *   **Question:** "Did we fix the root cause of last Tuesday's outage?"
    *   **Mechanism:** Replay the specific traffic pattern and environmental conditions (if possible) from the incident timestamp.
    *   **Metrics:** Reproduction of failure state vs. Successful handling.

*   **Cost/Performance Scenarios (`STRESS_TEST`):**
    *   **Question:** "What if traffic doubles during the Black Friday sale?"
    *   **Mechanism:** Generate synthetic load at 2x, 5x, 10x current volume.
    *   **Metrics:** Saturation points, Auto-scaling latency, Estimated cloud cost.

### 1.2 Inputs
*   **Config Snapshots:** A capture of the current production configuration (environment variables, feature flags, secrets).
*   **Traffic Source:**
    *   *Live Mirror:* Real-time duplication of incoming requests (asynchronous, fire-and-forget).
    *   *Log Replay:* Reconstructing requests from access logs or tracing data (OpenTelemetry).
    *   *Synthetic:* Generated traffic based on schemas or heuristics.
*   **State Snapshot:** A forked copy of the relevant database or in-memory state (e.g., using Copy-on-Write storage or temporary test databases).

### 1.3 Outputs
*   **Predicted SLO Impact:** "Expect P95 Latency to increase by 20ms."
*   **Blast Radius:** "This change affects 35% of Premium Tier tenants."
*   **Risk Score:** 0-100 score indicating the danger of the change.
*   **Cost Delta:** "Estimated +$500/day in AWS costs."

## 2. Sandbox & Replay Architecture

### 2.1 Tenant/Service Cloning
To ensure safety and fidelity, we use a **Multi-Level Isolation** strategy:

1.  **Level 0 (Logic Check):** Pure logic verification (e.g., OPA unit tests). fast, no state needed.
2.  **Level 1 (Stateless Sandbox):** Service is spun up with mocked databases. Good for code logic and config checks.
3.  **Level 2 (Data Forking):**
    *   For **Postgres**: Use file-system level snapshots (e.g., ZFS/LVM snapshots or cloud-native database branching like Neon) to create an instant, copy-on-write clone of the data for the simulation session.
    *   For **Neo4j**: Use a read-only replica or an in-memory graph projection if the dataset fits.
    *   **PII Safety:** All PII in the cloned data is automatically redacted or masked *during the clone process* unless specifically authorized for high-privilege debugging.

### 2.2 Traffic Shadowing & Mirroring
We implement a **Simulation Sidecar** or utilize the existing Service Mesh/Gateway:

*   **Traffic Tapping:** The API Gateway (or Ingress) asynchronously mirrors 1% (configurable) of incoming requests to a generic `sim-ingest` queue (e.g., Kafka/NATS).
*   **Replay Workers:** Stateless workers consume from `sim-ingest`, rewrite the destination to the **Sandbox Environment**, and execute the request.
*   **Header Injection:** Replayed requests have specific headers injected (`X-CompanyOS-Simulation: true`, `X-Sim-Scenario-ID: <uuid>`) to ensure downstream services handle them correctly (e.g., suppressing external emails/payments).

### 2.3 Safety Boundaries
*   **Write Blocking:** The Sandbox environment is configured to mock external write operations (Stripe charges, Slack notifications, Twilio SMS) to prevent "Real World Side Effects".
*   **Resource Quotas:** Simulations run in a constrained namespace/cgroup to prevent starving production resources.
*   **TTL:** All simulation artifacts (sandbox containers, cloned DBs) have a hard TTL (e.g., 1 hour) and are aggressively garbage collected.

## 3. UX & Workflows

### 3.1 Who runs simulations?
*   **DevOps/SRE:** For config changes, scaling events, and incident post-mortems.
*   **Product Managers:** For "What if we change the pricing model?" (Config/Policy).
*   **Security Engineers:** For "What if we block this IP range?" (Policy).
*   **Automated CI/CD:** Every PR automatically runs a "Deployment Impact" simulation.

### 3.2 "What If" Workflows
*   **Embedded in Admin Panel:** Next to every Feature Flag toggle or Policy Editor, a "Simulate Impact" button appears.
    *   *Click "Simulate Impact"* -> *Modal opens asking for Traffic Source (Last 1 hour)* -> *Progress Bar* -> *Result Card (Risk: LOW, Latency: +2%)*.
*   **Pull Request Integration:** "Jules (Bot): Simulation run complete. High Risk detected. P99 Latency increased by 200%."

### 3.3 Visualization & Evidence
*   **Scorecards:** A simple Red/Yellow/Green scorecard for every simulation.
*   **Diff Views:** "Before vs. After" graphs for key metrics (Latency, Error Rate).
*   **Audit Trail:** Every major production change must link to a passed Simulation ID as evidence of due diligence.

## 4. Artifacts

### 4.1 Example Scenario Spec: "Strict DLP Policy"
```yaml
name: "Enable Strict DLP for Q3"
type: POLICY_CHANGE
parameters:
  policy_id: "dlp-strict-v2"
  mode: "enforce" # vs "report-only"
traffic_source:
  type: LIVE_MIRROR
  sample_rate: 10%
  duration: 30m
success_criteria:
  - metric: false_positive_rate
    threshold: "< 0.1%"
  - metric: latency_p95
    threshold: "< 50ms added"
```

### 4.2 Example Scenario Spec: "Double Traffic Load"
```yaml
name: "Black Friday Load Test"
type: STRESS_TEST
parameters:
  load_multiplier: 2.0
traffic_source:
  type: RECORDED_SESSION
  source_id: "last-tuesday-peak"
success_criteria:
  - metric: error_rate
    threshold: "< 1%"
  - metric: cpu_utilization
    threshold: "< 80%"
```

### 4.3 Checklist: "Scenario is safe and meaningful if..."
*   [ ] **Side Effects Blocked:** Are we sure this won't charge credit cards or email users? (Verified by `X-CompanyOS-Simulation` header check).
*   [ ] **Data Privacy:** Is the data used for simulation free of unmasked PII?
*   [ ] **Traffic Representative:** Does the traffic sample include edge cases (e.g., large payloads, rare API calls)?
*   [ ] **Isolation:** Is the sandbox network-isolated from production databases?
*   [ ] **Clean Teardown:** Will the environment be destroyed automatically after the run?
