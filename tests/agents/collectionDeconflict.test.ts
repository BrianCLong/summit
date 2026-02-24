import { createCollectionTask, CollectionTask } from '../../src/agents/collection/tasking';
import { isDuplicate, deconflictTasks } from '../../src/agents/collection/deconflict';
import { MetricsEmitter } from '../../src/agents/collection/impactMetrics';

function runTest() {
  console.log('Starting Collection Deconfliction Test...');
  let failures = 0;

  const existingTasks: CollectionTask[] = [
    createCollectionTask('https://example.com', 'scrape', {}, 'medium'),
    createCollectionTask('api.example.com', 'api', {}, 'high')
  ];

  // Case 1: Duplicate Task
  const duplicateTask = createCollectionTask('https://example.com', 'scrape', {}, 'low');
  if (isDuplicate(duplicateTask, existingTasks)) {
    console.log('✅ Duplicate detected correctly');
  } else {
    console.error('❌ Duplicate detection failed');
    failures++;
  }

  // Case 2: New Task
  const newTask = createCollectionTask('https://google.com', 'scrape', {}, 'medium');
  if (!isDuplicate(newTask, existingTasks)) {
    console.log('✅ New task allowed correctly');
  } else {
    console.error('❌ New task blocked incorrectly');
    failures++;
  }

  // Case 3: Deconflict Batch
  const batch = [duplicateTask, newTask];
  const deconflicted = deconflictTasks([duplicateTask, newTask], existingTasks);

  // Note: deconflictTasks filters out duplicates. So duplicateTask should be removed.
  // Wait, duplicateTask IS duplicate. So it should be removed.
  // newTask is NOT duplicate. So it should remain.
  if (deconflicted.length === 1 && deconflicted[0].target === 'https://google.com') {
    console.log('✅ Batch deconfliction worked');
  } else {
    console.error(`❌ Batch deconfliction failed. Expected 1 task, got ${deconflicted.length}`);
    failures++;
  }

  // Case 4: Metrics
  const metrics = new MetricsEmitter();
  metrics.recordTaskCreation(); // for existing
  metrics.recordTaskCreation(); // for existing

  // Simulate processing batch
  batch.forEach(t => {
      if (isDuplicate(t, existingTasks)) {
          metrics.recordDuplicationBlock();
      } else {
          metrics.recordTaskCreation();
          metrics.recordDeconfliction(); // assuming passed deconfliction check
      }
  });

  const m = metrics.getMetrics();
  // 2 existing created.
  // batch has 1 duplicate (blocked) -> duplication_blocks = 1
  // batch has 1 new (created) -> tasks_created = 3
  if (m.tasks_created === 3 && m.duplication_blocks === 1) {
      console.log('✅ Metrics recorded correctly');
  } else {
      console.error(`❌ Metrics failed: ${JSON.stringify(m)}`);
      failures++;
  }

  if (failures > 0) {
    console.error(`\n❌ Collection Tests Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All Collection Tests Passed');
  }
}

runTest();
