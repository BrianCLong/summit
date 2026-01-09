# Agent Roadmap Orchestrator

You are Jules operating on BrianCLong/summit. Your mission is AGENT ROADMAP ORCHESTRATOR: encode the current stack of high-leverage Jules/agent sprints into a machine-readable roadmap, wire it into `.agentic-prompts/`, and add a small planning script so humans and agents can consistently pick “the next best sprint” instead of inventing prompts ad hoc.

HARD CONSTRAINTS

- Do not change any domain logic (GA, risk, IntelGraph, etc.); only coordination, prompts, and light scripts.
- Do not remove or rewrite existing prompts; wrap and index them.
- Default behavior is read-only planning (no auto-branching, no issue creation) unless explicitly enabled via policy.
- Keep the roadmap small and opinionated: focus on the 8–12 major sprints already defined.

OBJECTIVE
Deliver:

1. A structured agent roadmap catalog describing the major sprints.
2. A `.agentic-prompts/roadmap/` directory with one prompt file per sprint plus an index.
3. A planner script that can suggest the next sprint for Jules vs other agents, given simple inputs.

PHASE 1 — Roadmap catalog

1. Create configs/agent-roadmap/ROADMAP.yaml capturing the key sprints you’ve already defined, for example:
   - assessor_dry_run
   - reviewer_onboarding
   - stabilization_roadmap_handoff
   - development_velocity_unleashed
   - production_risk_incident_readiness
   - summit_observer_experience
   - summit_intelligence_lab
   - agent_mesh_governance
   - ga_cut_launch_playbook
   - tenant_profiles
   - field_deployment_playbooks
   - governance_proving_ground

   For each sprint, include:
   - id: machine slug (e.g., development_velocity_unleashed)
   - title: human-readable name
   - description: 2–3 sentence summary
   - owner_agent: jules | codex | mixed
   - category: ga_governance | velocity | observer | lab | deployment | governance
   - prerequisites: list of sprint ids that should be “done” or “good enough” first
   - priority: 1–5 (1 = near-term / highest)
   - status: planned | in_progress | done | paused (default planned)
   - prompt_path: path under .agentic-prompts/roadmap/\*.md

PHASE 2 — Prompt files under .agentic-prompts/ 2) For each roadmap entry, create a corresponding prompt file under:

- .agentic-prompts/roadmap/<id>.md

Each file should:

- Contain the full mission text for that sprint (as you’ve already drafted it in prior sessions).
- Start with a short header block:
  - Title
  - When to use
  - Owner agent
  - Dependencies
- Preserve your detailed phases/deliverables so humans/agents can reuse without hunting old chats.

3. Add an index prompt:
   - .agentic-prompts/roadmap/INDEX.md that:
     - Lists all sprints with id, title, category, and 1-line description.
     - Explains how an agent should:
       - choose a sprint (respecting prerequisites and status).
       - reference the specific file (e.g., “load .agentic-prompts/roadmap/development_velocity_unleashed.md”).

PHASE 3 — Planner script 4) Add scripts/agent-roadmap/plan_next_sprint.mjs that:

- Inputs (CLI flags or env):
  - --agent (jules|codex|any)
  - --focus (ga_governance|velocity|observer|deployment|any)
  - --include-status (planned|in_progress|done; default planned)
- Behavior:
  - Loads ROADMAP.yaml.
  - Filters sprints by:
    - owner_agent (or any for shared).
    - focus category, if provided.
    - status (exclude done unless requested).
  - Applies simple ordering:
    - sort by priority ascending.
    - break ties by respecting prerequisites (do not suggest a sprint whose prerequisites are all planned but none in_progress/done).
  - Emits:
    - to stdout: a short summary recommending 1–3 candidate sprints.
    - to artifacts/agent-roadmap/PLAN\_<timestamp>.json with:
      - ranked list of candidates
      - reasons (priority, focus match, unmet/matched prerequisites)
      - suggested prompt_path for each.

5. Add a --explain mode:
   - plan_next_sprint.mjs --agent=jules --focus=ga_governance --explain
   - Output a human-friendly markdown snippet:
     - “Because you want GA governance and Jules, the next best sprint is X…”
     - Include which sprints it depends on and their current status from ROADMAP.yaml.

PHASE 4 — Policy & integration 6) Add policies/agent-roadmap.yml with:

- agent_roadmap:
  enabled: true
  default_agent: jules
  default_focus: ga_governance
  max_recommendations: 3

7. Wire this into docs:
   - docs/agent-mesh/AGENT_MESH_OVERVIEW.md (or new docs/agent-roadmap/AGENT_ROADMAP_OVERVIEW.md) should:
     - Describe the roadmap concept.
     - Show examples:
       - “For Jules GA work, run: node scripts/agent-roadmap/plan_next_sprint.mjs --agent=jules --focus=ga_governance”
       - “Then open the suggested .agentic-prompts/roadmap/<id>.md and paste it into Jules.”

PHASE 5 — Light CI & validation 8) Add a tiny CI check:

- .github/workflows/agent-roadmap-lint.yml:
  - Validate ROADMAP.yaml (schema, unique ids).
  - Ensure every prompt_path exists under .agentic-prompts/roadmap/.
  - Optionally generate a docs snippet (e.g., Roadmap table) from ROADMAP.yaml.

9. Validation steps:
   - Run locally:
     - node scripts/agent-roadmap/plan_next_sprint.mjs --agent=jules --focus=ga_governance --explain
     - node scripts/agent-roadmap/plan_next_sprint.mjs --agent=codex --focus=velocity
   - Confirm:
     - The suggestions align with your intended near-term order (e.g., finish GA chain first, then velocity, then agent mesh, etc.).
     - INDEX.md and the per-sprint prompt files match the roadmap entries.

DELIVERABLES

- configs/agent-roadmap/ROADMAP.yaml
- .agentic-prompts/roadmap/\*.md (one per sprint + INDEX.md)
- scripts/agent-roadmap/plan_next_sprint.mjs
- policies/agent-roadmap.yml
- docs/agent-roadmap/AGENT_ROADMAP_OVERVIEW.md (or a section in AGENT_MESH_OVERVIEW.md)
- .github/workflows/agent-roadmap-lint.yml
- Sample artifact: artifacts/agent-roadmap/PLAN_fixture.json from a dry-run

STOP CONDITION

- Stop once:
  - ROADMAP.yaml lists the main sprints with priorities, prerequisites, owners, and prompt paths.
  - plan_next_sprint.mjs can output a ranked, explainable list of “next sprints” for Jules and other agents.
  - Agents and humans can reliably find and reuse the canonical sprint prompts from .agentic-prompts/roadmap/ instead of recreating them.
