# Product Plan: SpiderFoot Parity & Proof Moat

## 1. Primary ICP: Enterprise Threat Intel

*   **Pain Statement:** Security teams are overwhelmed by noisy, opaque alerts from automated OSINT tools that lack the evidence required for action, leading to high false-positive burdens and lack of trust in automated intelligence.
*   **Buying Trigger:** A missed critical vulnerability or brand impersonation incident due to alert fatigue, or an audit failure regarding incident response provenance.
*   **Budget Owner:** CISO or Director of Threat Intelligence.
*   **Why-Now:** The shift towards AI-driven analysis demands auditable, deterministic inputs to prevent hallucinations and ensure accountability.

## 2. MVP Scope (Parity Kernel)

*   **Analyst:** Needs a case-first UI to view investigations, review evidence citations (`EVIDENCE_ID`), and understand the *why* behind a score.
*   **Operator:** Needs a reliable runner to execute SpiderFoot modules and custom modules deterministically, with clear backpressure and rate limiting.
*   **Manager:** Needs the Provable Actionability Index (PAI) dashboard to prove the ROI of the platform, showing how many alerts led to actions *with* court-grade evidence.

## 3. Proof Moat Spec

*   **Evidence Bundle UX:** The UI must display the chain of custody for every finding. Users can click "Verify" to validate the cryptographic signature in-browser, or download the bundle for offline replay.
*   **Scoring Transparency:** Every risk score (e.g., for vulnerabilities or brand impersonation) must include a feature log showing the exact weights and inputs that determined the score.
*   **Case-First & Diff-Native:** The default view is not a list of raw alerts, but a "Case" showing what has *changed* since the last run (the diff) and the recommended actions.

## 4. Integrations Spec

*   **Webhook:** Generic JSON push for custom integrations.
*   **SIEM:** Splunk HEC integration for pushing high-confidence, evidence-backed alerts.
*   **Ticketing:** Jira Service Management integration to automatically create and update tickets with embedded evidence links.
*   **Risk Lists:** Ability to publish sanitized, policy-governed indicators as a dynamic risk list for consumption by firewalls and EDRs.

## 5. Demo Script: "Provable Actionability" (15 min)

1.  **The Hook (2 min):** Show a noisy traditional OSINT alert vs. a Summit "Case". Highlight the `EVIDENCE_ID` citation.
2.  **The Engine (5 min):** Trigger a brand impersonation scan. Show the SpiderFoot adapter fetching data, the pipeline generating the Evidence Bundle, and the deterministic hashing in real-time.
3.  **The Moat (5 min):** Download the Evidence Bundle. Run the `summit verify <bundle>` CLI command offline to prove the chain of custody and data integrity. Show the feature log for the risk score.
4.  **The Action (3 min):** Demonstrate the automatic creation of a Jira ticket containing the verified evidence packet, ready for legal takedown.

## 6. Prioritized Backlog (Epics to Stories)

### Epic 1: The Trust Kernel (Weeks 1-2)
*   **Story:** As a pipeline executor, I need to generate a deterministic BLAKE3 hash of my outputs.
*   **Story:** As the evidence system, I need to assemble the `stamp.json` and sign the complete bundle so its chain of custody is provable.
*   **Story:** As an operator, I can run `summit verify <bundle_file>` locally to assert its integrity without relying on the cloud platform.

### Epic 2: SpiderFoot Subsumption (Weeks 3-4)
*   **Story:** As the module runner, I can invoke an external SpiderFoot Docker container with specific target inputs.
*   **Story:** As the ingestion pipeline, I can parse SpiderFoot's raw CSV output and map the fields to Summit's Graph Entity schema.
*   **Story:** As an analyst, I can view the imported SpiderFoot data inside the Case UI, with provenance tracing back to the execution run.

### Epic 3: High-Value Intelligence Scenarios (Weeks 5-6)
*   **Story:** As a brand protection analyst, I want the system to automatically trigger a screenshot capture and WHOIS lookup whenever a typosquat domain is detected.
*   **Story:** As a security operations manager, I want alerts regarding urgent CVEs to automatically create Jira tickets, embedding a direct link to the Evidence Bundle.
*   **Story:** As a user, I can see a "feature explanation log" alongside every vulnerability risk score, justifying why it was ranked "High" or "Low".

### Epic 4: Actionability & Reporting (Weeks 7-8)
*   **Story:** As a CISO, I can view a dashboard displaying the Provable Actionability Index (PAI) for the current month.
*   **Story:** As a threat intel lead, I can see a timeline of diffs (what changed between yesterday's scan and today's scan) rather than an isolated list of alerts.
