import { registry } from '../server/src/evolution/deprecation/DeprecationRegistry.js';
import { DeprecationStage } from '../server/src/evolution/deprecation/types.js';

// Example script to demonstrate registration of a deprecation
const main = () => {
  const componentId = process.argv[2];
  const stage = process.argv[3] as DeprecationStage;
  const reason = process.argv[4] || 'Planned evolution';

  if (!componentId || !stage) {
    console.error('Usage: ts-node scripts/deprecate.ts <componentId> <stage> [reason]');
    process.exit(1);
  }

  console.log(`Registering deprecation for ${componentId}...`);

  // In a real scenario, this would persist to a DB or config file.
  // For this prototype, we just simulate the registration logic via the singleton.

  registry.register({
    id: componentId,
    type: 'api',
    stage: stage,
    reason: reason,
    since: new Date().toISOString(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
    owner: 'Platform Team'
  });

  console.log('Deprecation registered successfully.');
  console.log(JSON.stringify(registry.get(componentId), null, 2));
};

main();
