# Persona Playbook Workbench

The Persona Playbook Workbench is a minimal interface (CLI) that allows analysts to inspect, select, and track persona-centric defensive playbooks.

## Commander's Intent
The Workbench is designed for **defensive planning only**. It is an organizational tool to help CTI analysts methodically work through response options. **There is no "one-click ops" button.** All outputs and states are confined to planning and local tracking, ensuring no automated engagement or influence operations are triggered.

## Abuse Analysis
*   **Potential Misuse:** Analysts could attempt to use the workbench to orchestrate attacks by marking malicious steps as "in progress".
*   **Design Constraints:**
    *   The tool enforces a strict separation between planning and execution. Updating a step's status in the workbench only updates a local tracking database. It does not integrate with external APIs or orchestration tools.
    *   The CLI explicitly banners every command with "Defensive Planning Only – No Automated Engagement" to consistently reinforce the defensive posture to the operator.
    *   The workbench only exposes templates loaded from the secure `summit/persona/playbooks_templates/` directory, preventing ad-hoc injection of offensive playbooks.

## Usage

### 1. Plan Playbooks for a Persona
When a new adversarial persona or cluster is identified, an analyst can generate recommended playbooks.

```bash
python summit/cli/personas_workbench.py plan-playbooks --persona-id P123 --risk-level HIGH --platforms linkedin twitter --campaign-id C456 --narrative-type executive-targeting
```
This evaluates the inputs against the template library and instantiates matching playbooks into the local tracking database.

### 2. Show a Playbook Instance
To view the generated phases and steps (including dependencies and automation constraints):

```bash
python summit/cli/personas_workbench.py show-playbook --instance-id EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE_INSTANCE_P123
```

### 3. Track Step Progress
As the analyst or external systems complete tasks, the status can be updated manually:

```bash
python summit/cli/personas_workbench.py update-step-status --instance-id EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE_INSTANCE_P123 --step-name "Baseline Executive Mention Volume" --status DONE
```
