# Cognitive Security: One-Page SOP

**Goal**: Coordinate rapid, rights-preserving response to cognitive incidents (disinfo, deepfakes, brand impersonation).
**Policy**: Deny-by-default (no profiling, no over-collection).

## 1. Triggers
*   **Executive Impersonation**: Video/audio of execs saying things they didn't say.
*   **Spoofed Assets**: Fake press release, cloned domain (typosquatting).
*   **Coordinated Swarm**: Rapid spike in negative sentiment/narratives across multiple platforms unrelated to actual product issues.
*   **Incident Coupling**: False narratives attaching to real tech outages.

## 2. Roles (Fusion Cell)
*   **Incident Commander (IC)**: Risk/Intel Lead. Decision authority.
*   **Comms Lead**: Drafts/approves external statements.
*   **Legal Lead**: Reviews rights risks, liability, and takedown requests.
*   **Cyber Liaison**: Checks for technical indicators (logs, breaches).

## 3. Timeline & Actions

### T+30 Minutes (Triage)
*   [ ] **Verify**: Is the artifact fake? (Use Verification Script).
*   [ ] **Assess**: Is this a "Cognitive Incident"? (See Threat Model).
*   [ ] **Contain**: If internal, notify employees. If external, monitor spread.
*   [ ] **Output**: `CognitiveAlert` object (severity, type).

### T+60 Minutes (Response)
*   [ ] **Decision**: Proactive holding statement vs. "Strategic Silence".
*   [ ] **Draft**: Use pre-approved templates (Holding Statement, FAQ).
*   [ ] **Legal Check**: Rights Impact Assessment (profiling check).
*   [ ] **Output**: Decision Log entry.

### T+180 Minutes (Mitigation)
*   [ ] **Takedown**: Submit evidence to platforms (if ToS violation).
*   [ ] **Debunk**: Publish factual correction (if approved).
*   [ ] **Gov**: Notify regulators (if required).
*   [ ] **Output**: Evidence Pack (`report.json`, `metrics.json`, `stamp.json`).

## 4. Hard Lines ("Do Not Do")
*   **NO** individual profiling of users (focus on content/behavior).
*   **NO** automated labeling or blocking of users without redress.
*   **NO** counter-influence operations (no bot farms, no fake accounts).
*   **NO** collection of data beyond what is strictly necessary for the incident.

## 5. Escalation Path
*   **Level 1**: Fusion Cell handles.
*   **Level 2**: CISO/General Counsel (if legal risk > $1M or reputational crisis).
*   **Level 3**: CEO/Board (if executive impersonation impacts stock price).
