
import { FileSystemGraphStore } from './store/filesystem.js';
import { Ticket, EvidenceBundle } from './schema/nodes.js';
import * as path from 'path';

async function main() {
  const root = path.join(process.cwd(), '.summit/demo-task-graph');
  console.log('🚀 Summit Ticket Graph Demo');
  console.log('Storing graph in:', root);

  const store = new FileSystemGraphStore(root);
  await store.init();

  // 1. Create a Ticket
  const ticketId = 'ticket-demo-1';
  console.log(`\n1. Creating Ticket: ${ticketId}`);
  const ticket: Ticket = {
    id: ticketId,
    type: 'ticket',
    title: 'Implement FileSystem Storage',
    description: 'Implement a filesystem-based storage for the Work Graph.',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'jules',
    status: 'in_progress',
    priority: 'P0',
    ticketType: 'feature',
    labels: ['core', 'storage'],
    agentEligible: true,
    complexity: 'simple'
  };
  await store.createNode(ticket);
  console.log('   ✓ Ticket created.');

  // 2. Add an Evidence Bundle
  const bundleId = 'evidence-demo-1';
  console.log(`\n2. Adding Evidence Bundle: ${bundleId}`);
  const evidenceBundle: EvidenceBundle = {
    id: bundleId,
    type: 'evidence_bundle',
    rubricScore: 92,
    checks: [
      { category: 'correctness', status: 'pass', details: 'Build passes with filesystem store enabled.' },
      { category: 'provenance', status: 'pass', details: 'Decision log initialized in ticket folder.' }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'jules'
  };
  await store.createNode(evidenceBundle);
  console.log('   ✓ Evidence bundle created.');

  // 3. Link Ticket -> Evidence Bundle
  console.log('\n3. Linking Ticket -> Evidence Bundle (produced)');
  await store.createEdge({
    id: 'edge-demo-1',
    type: 'produced',
    sourceId: ticketId,
    targetId: bundleId,
    createdAt: new Date(),
    createdBy: 'system',
    weight: 1
  });
  console.log('   ✓ Edge created.');

  // 4. Update Ticket Status
  console.log('\n4. Updating Ticket Status -> done');
  await store.updateNode(ticketId, {
    status: 'done',
    completedAt: new Date()
  });
  console.log('   ✓ Ticket updated.');

  // 5. Verification
  console.log('\n5. Verifying Date Hydration');
  const loadedTicket = await store.getNode<Ticket>(ticketId);
  if (loadedTicket && loadedTicket.createdAt instanceof Date) {
      console.log('   ✓ loadedTicket.createdAt is a Date object');
  } else {
      console.error('   ❌ loadedTicket.createdAt is NOT a Date object:', loadedTicket?.createdAt);
      process.exit(1);
  }

  console.log('\n✅ Demo Complete. Check folder:', root);
}

main().catch(console.error);
