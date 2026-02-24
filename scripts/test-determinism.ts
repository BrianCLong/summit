import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  setGlobalSeed,
  deterministicUUID,
  generateRunManifest,
  saveRunManifest,
  TaskGraph,
  Scheduler,
  appendEvent,
  OrchestratorEvent
} from '../packages/orchestrator/src/index.js';

async function main() {
  const args = process.argv.slice(2);
  let outputDir = args[0];

  const seed = 12345;
  const runId = `test-run-${seed}`; // Fixed Run ID
  const fixedTime = "2026-02-01T12:00:00.000Z"; // Fixed Time

  console.log(`Starting deterministic test run: ${runId}`);
  setGlobalSeed(seed);

  // If outputDir is provided, save strictly there (no subdirectory).
  // Otherwise default to ~/.summit/runs/{runId}
  const baseDir = outputDir ? path.resolve(outputDir) : path.join(os.homedir(), '.summit', 'runs', runId);
  const manifestPath = path.join(baseDir, 'manifest.json');
  const logPath = path.join(baseDir, 'events.jsonl');

  await fs.ensureDir(baseDir);
  // Clean up if exists to ensure fresh run
  if (!outputDir) {
      await fs.remove(baseDir);
      await fs.ensureDir(baseDir);
  } else {
      await fs.emptyDir(baseDir);
  }

  // 1. Initialize Graph
  const graph = new TaskGraph();
  const scheduler = new Scheduler(graph);

  // 2. Generate Events
  const events: OrchestratorEvent[] = [];

  // Event 1: Create Task A (using input-based UUID)
  const taskIdA = deterministicUUID('task', 'task-a-input');
  const eventA: OrchestratorEvent = {
    evidence_id: deterministicUUID('evidence', 'ev-1'),
    type: 'TASK_CREATED',
    team_id: 'team-alpha',
    payload: {
      id: taskIdA,
      subject: 'Task A',
      status: 'pending',
      blockedBy: [],
      blocks: [],
      timestamps: { created: fixedTime }
    }
  };
  events.push(eventA);

  // Event 2: Create Task B (blocked by A)
  const taskIdB = deterministicUUID('task', 'task-b-input');
  const eventB: OrchestratorEvent = {
    evidence_id: deterministicUUID('evidence', 'ev-2'),
    type: 'TASK_CREATED',
    team_id: 'team-alpha',
    payload: {
      id: taskIdB,
      subject: 'Task B',
      status: 'pending',
      blockedBy: [taskIdA],
      blocks: [],
      timestamps: { created: fixedTime }
    }
  };
  events.push(eventB);

  // Event 3: Start Task A (using random UUID)
  const eventStartA: OrchestratorEvent = {
    evidence_id: deterministicUUID('evidence'), // Sequence based
    type: 'TASK_STARTED',
    team_id: 'team-alpha',
    payload: {
      taskId: taskIdA,
      agentId: 'agent-007',
      timestamp: fixedTime
    }
  };
  events.push(eventStartA);

  // Event 4: Complete Task A
  const eventCompleteA: OrchestratorEvent = {
    evidence_id: deterministicUUID('evidence'), // Sequence based
    type: 'TASK_COMPLETED',
    team_id: 'team-alpha',
    payload: {
      taskId: taskIdA,
      timestamp: fixedTime
    }
  };
  events.push(eventCompleteA);

  // 3. Save Events and Apply to Scheduler
  for (const event of events) {
    await appendEvent(logPath, event);
    scheduler.applyEvent(event);
  }

  // 4. Calculate Final Hash
  const finalHash = graph.getHash();
  console.log(`Final Graph Hash: ${finalHash}`);

  // 5. Generate and Save Manifest
  const manifest = generateRunManifest(runId, seed, {
    final_state_hash: finalHash,
    agent_graph_version: 'v1.0.0',
    created_at: fixedTime // Override created_at for determinism
  });

  await saveRunManifest(manifest, manifestPath);

  console.log(`Run completed. Artifacts saved to ${baseDir}`);

  // Output Run ID for the caller (workflow)
  console.log(`::set-output name=run_id::${runId}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
