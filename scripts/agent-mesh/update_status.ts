import fs from 'fs';
import path from 'path';

const STATUS_FILE = 'docs/roadmap/STATUS.json';

const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));

const project19 = {
  "id": "F",
  "name": "Project 19: Autonomous Multi-Agent Mesh",
  "epics": [
    {
      "id": "F1",
      "name": "Mesh Orchestrator Spec + Schemas",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "docs/agent-mesh/MESH_ORCHESTRATOR_SPEC.md, schemas/agent-mesh/, scripts/agent-mesh/validate_schemas.ts"
    },
    {
      "id": "F2",
      "name": "Prompt Registry",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "prompts/registry/, scripts/agent-mesh/register_prompt.ts"
    },
    {
      "id": "F3",
      "name": "Domain Agent Contracts",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "docs/agent-mesh/agents/"
    },
    {
      "id": "F4",
      "name": "Handoff Bundles",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "scripts/agent-mesh/write_handoff_bundle.ts, schemas/agent-mesh/agent_handoff.schema.json"
    },
    {
      "id": "F5",
      "name": "Deterministic Orchestrator Implementation",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "scripts/agent-mesh/run_orchestrator.ts, jobs/nightly_governance_job.json"
    },
    {
      "id": "F6",
      "name": "PR Hygiene Enforcement",
      "status": "rc-ready",
      "owner": "Jules",
      "evidence": "docs/agent-mesh/PR_HYGIENE_POLICY.md, scripts/agent-mesh/check_pr_hygiene.ts, .github/workflows/pr-hygiene.yml"
    }
  ]
};

// Check if already exists
const idx = status.initiatives.findIndex(i => i.id === 'F');
if (idx !== -1) {
    status.initiatives[idx] = project19;
} else {
    status.initiatives.push(project19);
}

// Recalculate summary
let rc_ready = 0;
let partial = 0;
let incomplete = 0;
let not_started = 0;
let total = 0;

status.initiatives.forEach(init => {
    init.epics.forEach(epic => {
        total++;
        if (epic.status === 'rc-ready') rc_ready++;
        else if (epic.status === 'partial') partial++;
        else if (epic.status === 'incomplete') incomplete++;
        else not_started++;
    });
});

status.summary = {
    rc_ready,
    partial,
    incomplete,
    not_started,
    total,
    ga_blockers: status.summary.ga_blockers || []
};

status.last_updated = new Date().toISOString();
status.revision_note = "Added Project 19: Autonomous Multi-Agent Mesh";

fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
console.log('Updated STATUS.json');
