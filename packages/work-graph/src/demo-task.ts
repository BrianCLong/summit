
import { FileSystemGraphStore } from './store/filesystem.js';
import { Task, Artifact } from './schema/nodes.js';
import * as path from 'path';

async function main() {
  const root = path.join(process.cwd(), '.summit/demo-task-graph');
  console.log('🚀 Summit Task Graph Demo');
  console.log('Storing graph in:', root);

  const store = new FileSystemGraphStore(root);
  await store.init();

  // 1. Create a Task
  const taskId = 'task-demo-1';
  console.log(`\n1. Creating Task: ${taskId}`);
  const task: Task = {
    id: taskId,
    type: 'task',
    title: 'Implement FileSystem Storage',
    description: 'Implement a filesystem-based storage for the Work Graph.',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'jules',
    status: 'in_progress',
    priority: 'P0',
    tags: ['core', 'storage'],
    gates: [
        { type: 'tests_pass', status: 'pending' },
        { type: 'lint_clean', status: 'passed' }
    ]
  };
  await store.createNode(task);
  console.log('   ✓ Task created.');

  // 2. Add an Artifact
  const artId = 'artifact-demo-1';
  console.log(`\n2. Adding Artifact: ${artId}`);
  const artifact: Artifact = {
    id: artId,
    type: 'artifact',
    path: 'src/store/filesystem.ts',
    summary: 'Implementation of GraphStore interface using fs/promises.',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'jules'
  };
  await store.createNode(artifact);
  console.log('   ✓ Artifact created.');

  // 3. Link Task -> Artifact
  console.log('\n3. Linking Task -> Artifact (produced)');
  await store.createEdge({
    id: 'edge-demo-1',
    type: 'produced',
    sourceId: taskId,
    targetId: artId,
    createdAt: new Date(),
    createdBy: 'system'
  });
  console.log('   ✓ Edge created.');

  // 4. Update Task Status
  console.log('\n4. Updating Task Status -> done');
  await store.updateNode(taskId, {
    status: 'done',
    gates: [
        { type: 'tests_pass', status: 'passed' },
        { type: 'lint_clean', status: 'passed' }
    ]
  });
  console.log('   ✓ Task updated.');

  // 5. Verification
  console.log('\n5. Verifying Date Hydration');
  const loadedTask = await store.getNode<Task>(taskId);
  if (loadedTask && loadedTask.createdAt instanceof Date) {
      console.log('   ✓ loadedTask.createdAt is a Date object');
  } else {
      console.error('   ❌ loadedTask.createdAt is NOT a Date object:', loadedTask?.createdAt);
      process.exit(1);
  }

  console.log('\n✅ Demo Complete. Check folder:', root);
}

main().catch(console.error);
