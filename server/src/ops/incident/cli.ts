import { IncidentManager } from './incident-manager.js';

// Simple CLI wrapper for invoking incident snapshots manually or via other tools
const args = process.argv.slice(2);
const command = args[0];

if (command === 'snapshot') {
  const incidentId = args[1] || `INC-${Date.now()}`;
  const severity = (args[2] as any) || 'SEV-3';

  console.log(`Triggering snapshot for ${incidentId}...`);

  IncidentManager.getInstance().captureSnapshot({
    incidentId,
    severity,
    description: 'Manual snapshot trigger',
    triggeredBy: 'CLI'
  }).then(path => {
    console.log(`Snapshot complete: ${path}`);
    process.exit(0);
  }).catch(err => {
    console.error('Snapshot failed:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node incident-cli.js snapshot [incidentId] [severity]');
}
