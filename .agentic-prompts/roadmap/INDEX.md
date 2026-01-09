# Agent Roadmap Prompt Index

Use this index to choose the next sprint prompt for governed execution. Always verify prerequisites
and status in `configs/agent-roadmap/ROADMAP.yaml` before starting a sprint.

## How to choose a sprint

1. Check prerequisites and status in `configs/agent-roadmap/ROADMAP.yaml`.
2. Use the planner script to rank candidates:
   - `node scripts/agent-roadmap/plan_next_sprint.mjs --agent=jules --focus=ga_governance --explain`
3. Load the prompt file for the selected sprint:
   - Example: `.agentic-prompts/roadmap/development_velocity_unleashed.md`

## Sprint catalog

| ID                                 | Title                                | Category      | Description                                                           |
| ---------------------------------- | ------------------------------------ | ------------- | --------------------------------------------------------------------- |
| assessor_dry_run                   | Assessor Dry Run                     | ga_governance | Governed rehearsal of assessor workflow with evidence capture.        |
| reviewer_onboarding                | Reviewer Onboarding                  | ga_governance | Standardize reviewer onboarding, evidence intake, and escalation.     |
| stabilization_roadmap_handoff      | Stabilization Roadmap Handoff        | ga_governance | Convert stabilization work into a governed handoff sequence.          |
| development_velocity_unleashed     | Development Velocity Unleashed       | velocity      | Accelerate delivery throughput with governed verification loops.      |
| production_risk_incident_readiness | Production Risk & Incident Readiness | ga_governance | Define risk inventory and incident readiness with evidence capture.   |
| summit_observer_experience         | Summit Observer Experience           | observer      | Improve observer workflow with deployable-first governance alignment. |
| summit_intelligence_lab            | Summit Intelligence Lab              | lab           | Operationalize experiments into governed backlog outcomes.            |
| agent_mesh_governance              | Agent Mesh Governance                | governance    | Define governance for agent mesh operations and auditability.         |
| ga_cut_launch_playbook             | GA Cut Launch Playbook               | ga_governance | Publish GA launch gates, evidence mapping, and signoffs.              |
| tenant_profiles                    | Tenant Profiles                      | deployment    | Define tenant profile configurations with policy-aligned tags.        |
| field_deployment_playbooks         | Field Deployment Playbooks           | deployment    | Assemble deployment playbooks with governance-aligned checklists.     |
| governance_proving_ground          | Governance Proving Ground            | governance    | Validate governance enforcement under load with evidence capture.     |
