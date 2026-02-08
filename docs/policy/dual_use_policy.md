# Dual-Use Policy: No Harmful Automation & Deny-by-Default

## 1. Purpose
To prevent the misuse of Summit s personal agent and Switchboard technologies for harmful purposes and to enforce a security-first posture.

## 2. Directives

### 2.1 No Harmful Automation
The system must not be used to generate, automate, or facilitate:
- Cyberattacks or unauthorized access to systems.
- Harassment, abuse, or hate speech.
- Misinformation or disinformation campaigns.
- Any activity that violates applicable laws or regulations.

### 2.2 Deny-by-Default Capabilities
All agent capabilities are denied by default. Access to tools, APIs, and data sources must be explicitly granted via a policy configuration.
- **Network Egress:** Blocked by default.
- **File System Access:** Blocked by default.
- **Code Execution:** Blocked by default.
- **Skill Usage:** Requires explicit "ALLOW" policy for each skill.

## 3. Enforcement
This policy is enforced via the Policy Graph and runtime guardrails. Violations will result in immediate termination of the agent session and potential account suspension.
