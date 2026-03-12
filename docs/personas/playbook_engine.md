# Persona Campaign Playbook Engine

This engine selects, instantiates, and scores persona-centric defensive playbooks based on incoming adversarial persona intelligence and campaign context.

## Commander's Intent
The engine is purely analytical and advisory. It turns observed persona data into recommended **defensive actions** (like triage, monitoring, internal alerting, and hardening). It *does not execute* these steps. It provides the analyst with a structured plan to react securely and appropriately to the intelligence gathered.

## Abuse Analysis
*   **Potential Misuse:** The engine could be manipulated to score offensive or external-facing tasks highly.
*   **Design Constraints:**
    *   The engine is restricted to processing templates from `summit/persona/playbooks_templates/`, which are vetted to be strictly defensive.
    *   It only *recommends* automations (`SAFE_AUTOMATION`), but does not contain execution loops.
    *   Scoring logic (`urgency`, `complexity`, `automation_coverage`) is transparent and hardcoded to defensive heuristics rather than targeting parameters.

## Example Flow
1.  **Input:** The engine receives a `PersonaHypothesis` (e.g., `persona_id=123`, `risk_level=HIGH`, platforms=[linkedin, twitter]) and a `CampaignContext` (e.g., `narrative_type=executive-targeting`).
2.  **Match:** It evaluates `applicability_conditions` in all loaded templates. It finds a match in the `EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE` template.
3.  **Instantiate:** It creates a `PersonaCampaignPlaybookInstance`. It assigns the specific persona/campaign IDs, expands all phases into steps with `status=PLANNED`.
4.  **Score:** It computes metrics. E.g., Urgency becomes "HIGH" (based on risk level), Complexity is calculated based on step count, and Automation Coverage based on the ratio of `SAFE_AUTOMATION` steps.

## API Usage
```python
from summit.persona.playbook_engine import PlaybookEngine, PersonaHypothesis, CampaignContext, PlatformAccount

engine = PlaybookEngine()

persona = PersonaHypothesis(
    persona_id="P123",
    risk_level="HIGH",
    platform_accounts=[PlatformAccount(platform="linkedin", account_id="li1", username="bot1")]
)
campaign = CampaignContext(campaign_id="C456", narrative_type="executive-targeting")

instances = engine.plan_playbooks_for_persona(persona, campaign)
```
