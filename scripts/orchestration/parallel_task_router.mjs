import fs from 'fs';
import path from 'path';

// This mapping defines which components touch which parts of the codebase.
// In a real system, this could be generated dynamically or be more sophisticated.
// TODO: Generate this map dynamically, perhaps from CODEOWNERS, to reduce maintenance.
const COMPONENT_FILE_MAP = {
  'Orchestrator Core': ['server/src/orchestrator/'],
  'Policy': ['server/src/policy/', 'policy/'],
  'Frontend': ['apps/webapp/src/'],
  'DR Orchestrator': ['server/src/dr/'],
  'Security': ['server/src/security/', 'docs/security/'],
  'Collaboration': ['apps/webapp/src/components/collaboration/'],
  'Integrations': ['server/src/integrations/'],
  'Ops': ['scripts/ops/', 'deploy/'],
  'AI/Governance': ['server/src/ai/governance/'],
  'Runtime': ['server/src/runtime/'],
  'Observability': ['packages/observability/', 'server/src/middleware/tracing.ts'],
  'Compliance': ['docs/compliance/'],
  'Performance': ['k6/'],
  'AI': ['server/src/ai/'],
  'Uncategorized': [],
};

/**
 * A conflict detector that checks for overlapping file paths among active tasks.
 * @param {Array<Object>} activeTasks - A list of task objects currently in progress.
 * @returns {Array<string>} A list of conflict messages.
 */
const detectConflicts = (activeTasks) => {
  const fileOwnership = new Map(); // path -> task.title
  const conflicts = [];

  for (const task of activeTasks) {
    const component = task.component || 'Uncategorized';
    const filepaths = COMPONENT_FILE_MAP[component] || [];

    for (const filepath of filepaths) {
      if (fileOwnership.has(filepath)) {
        conflicts.push(`Conflict detected: Component "${component}" (from task "${task.title}") overlaps with component "${fileOwnership.get(filepath)}" on path "${filepath}".`);
      } else {
        fileOwnership.set(filepath, task.component);
      }
    }
  }

  return conflicts;
};

const main = () => {
  const analysisPath = path.resolve(process.cwd(), 'artifacts/orchestration/backlog_analysis.json');

  if (!fs.existsSync(analysisPath)) {
    console.error('Error: Backlog analysis file not found. Please run analyze_backlog.mjs first.');
    process.exit(1);
  }

  const analysisFile = fs.readFileSync(analysisPath, 'utf8');
  const analysisData = JSON.parse(analysisFile);

  const parallelizableTasks = analysisData.parallelizable_groups;
  const agentRecommendations = analysisData.agent_routing_recommendations;

  console.log('--- Parallel Task Router ---');

  // Take the top N parallelizable tasks (e.g., one from each component)
  const tasksToRoute = [];
  const componentsUsed = new Set();
  for (const component in parallelizableTasks) {
    if (parallelizableTasks[component].length > 0) {
      // Ensure we don't have multiple tasks from the same high-level component (e.g., "AI")
      const rootComponent = component.split('/')[0];
      if (!componentsUsed.has(rootComponent)) {
        tasksToRoute.push(parallelizableTasks[component][0]);
        componentsUsed.add(rootComponent);
      }
    }
  }

  console.log('\n1. Selected Tasks for Parallel Execution:');
  tasksToRoute.forEach(task => {
    const agent = agentRecommendations[task.title] || 'Codex';
    const component = task.component || 'Uncategorized';
    const branchName = `jules/task/${component.toLowerCase().replace(/[\/ ]/g, '-')}/${task.title.toLowerCase().replace(/ /g, '-').substring(0, 20)}`;
    console.log(`  - Task: "${task.title}"`);
    console.log(`    - Component: ${component}`);
    console.log(`    - Assigned Agent: ${agent}`);
    console.log(`    - Branch Name: ${branchName}`);
  });

  console.log('\n2. Conflict Detection:');
  const conflicts = detectConflicts(tasksToRoute);
  if (conflicts.length === 0) {
    console.log('  - ✅ No conflicts detected among the selected parallel tasks.');
  } else {
    conflicts.forEach(conflict => console.log(`  - 🔥 ${conflict}`));
  }

  console.log('\n--- Router Finished ---');
};

main();
