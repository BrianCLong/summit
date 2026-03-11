# Persona Campaign Playbook Templates

This document outlines the templates used by the Persona Campaign Playbook Engine. These templates turn adversarial persona intelligence into repeatable, persona-centric defensive playbooks for narrative and CTI campaigns.

## Commander's Intent
The primary objective of these playbooks is to provide **defensive response guidance**. This includes monitoring, triage, hardening, and internal communications.
**These playbooks MUST NOT be used for operational targeting, automated outbound engagement, or influence operations.**

## Abuse Analysis
*   **Potential Misuse:** Playbook templates could theoretically be repurposed into targeting checklists or offensive influence playbooks.
*   **Design Constraints:**
    *   Objectives are strictly limited to defensive outcomes (e.g., "reduce amplification", "protect executive brand", "increase early warning").
    *   No steps exist for outbound manipulation or attacks. Action steps are framed as internal communication, alerting, and hardening.
    *   Roles are assigned to internal analysts (e.g., CTI Analyst, Legal, Comms), keeping operations within controlled governance structures.

## Schema
Templates are authored in YAML format and conform to the `PersonaCampaignPlaybookTemplate` Pydantic schema in `summit/persona/playbooks.py`.

A typical template includes:
*   `playbook_id`: Unique identifier.
*   `name`: Human-readable name.
*   `applicability_conditions`: Dictates when this playbook should be recommended (e.g., based on persona risk level, platform spread, campaign type).
*   `objectives`: Defensive goals.
*   `phases`: Organized into standard CTI phases: OBSERVE, ORIENT, DECIDE, ACT. Each phase contains steps.
    *   Each step defines a `step_type` constraint: `HUMAN_ONLY`, `AGENT_ASSIST`, or `SAFE_AUTOMATION`.
*   `role_assignments`: Stakeholders involved.
*   `automation_suggestions`: Ideas for safe automations without outbound engagement.

## Adding New Templates
1. Create a new `.yaml` file in `summit/persona/playbooks_templates/`.
2. Ensure the YAML structure matches the `PersonaCampaignPlaybookTemplate` schema.
3. Validate loading using the tests in `tests/persona/test_playbook_templates.py`.
