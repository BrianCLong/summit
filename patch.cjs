const fs = require('fs');
const path = require('path');

const orchestratorPath = path.join('summit', 'agents', 'orchestrator', 'agent-orchestrator.ts');
let content = fs.readFileSync(orchestratorPath, 'utf8');

const importsToAdd = `
import { globalRegistry } from './uncertainty/registry.js';
import { UncertaintySensorRunner } from './uncertainty/sensors.js';
import { globalPolicyEngine } from './uncertainty/policy-engine.js';
`;

// Add imports
content = content.replace(
  "import { randomUUID } from 'node:crypto';",
  "import { randomUUID } from 'node:crypto';" + importsToAdd
);

// Add sensor runner property
content = content.replace(
  "private readonly eventLog = new EventLogWriter(),\n  ) {}",
  "private readonly eventLog = new EventLogWriter(),\n    private readonly sensorRunner = new UncertaintySensorRunner(),\n  ) {}"
);

// Add uncertainty logic in run loop
const beforeTaskLogic = `
      this.emit({
        run_id,
        task_id: task.id,
        agent_name: null,
        ts: new Date().toISOString(),
        type: 'TASK_DEQUEUED',
        inputs_hash: inputsHash,
        outputs_hash: null,
        attempt: 1,
        status: 'started',
        metadata: {},
      });
`;

const afterTaskLogic = beforeTaskLogic + `
      // --- UNCERTAINTY REPRESENTATION & IDENTIFICATION ---
      // Ensure we have a baseline record for this task
      const existingRecords = globalRegistry.findByEntity(task.id);
      if (existingRecords.length === 0) {
        globalRegistry.createRecord(task.id, {}, { source_agent: 'orchestrator' });
      }

      // --- UNCERTAINTY ADAPTATION (POLICY CHECK) ---
      const policyActions = globalPolicyEngine.evaluatePlan(task.metadata || {}, globalRegistry.findByEntity(task.id));
      let shouldBlock = false;
      let policyAdaptationReason = '';

      for (const action of policyActions) {
        if (action.action_type === 'block_and_route') {
          shouldBlock = true;
          policyAdaptationReason = \`Blocked by uncertainty policy: \${action.parameters.reason}\`;
        } else if (action.action_type === 'add_step' || action.action_type === 'adjust_sampling') {
           // We might adapt the task here if needed
           console.log(\`Adapting task \${task.id} due to policy action: \${action.action_type}\`);
        }
      }

      if (shouldBlock) {
        this.emit({
          run_id,
          task_id: task.id,
          agent_name: null,
          ts: new Date().toISOString(),
          type: 'TASK_FAILED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'failed',
          metadata: { reason: policyAdaptationReason },
        });
        results.push({
          task_id: task.id,
          status: 'failed',
          outputs: {},
          error: policyAdaptationReason,
          attempt: 1,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
        continue;
      }
`;

content = content.replace(beforeTaskLogic, afterTaskLogic);

const afterAgentSuccess = `
          if (result.status === 'success') {
            break;
          }
`;

const afterAgentSuccessUpdated = `
          if (result.status === 'success') {
             // Run sensors on output to identify any new uncertainty
             this.sensorRunner.runAll(task.id, result.outputs, globalRegistry);
            break;
          }
`;

content = content.replace(afterAgentSuccess, afterAgentSuccessUpdated);

fs.writeFileSync(orchestratorPath, content, 'utf8');
console.log("Orchestrator updated successfully.");
