/* eslint-disable no-console */
/**
 * Summit Work Graph - Demo
 *
 * Demonstrates the key features of the work-graph package.
 */

import { InMemoryGraphStore } from './store/neo4j.js';
import { EventBus } from './events/bus.js';
import { PlannerOrchestrator } from './planner/orchestrator.js';
import { WorkMarket } from './agents/market.js';
import { PolicyEngine } from './policy/engine.js';
import { PortfolioSimulator } from './portfolio/simulator.js';
import { MetricsDashboard } from './metrics/dashboard.js';
import { AutoTriageEngine } from './triage/auto-triage.js';
import type { Intent, Ticket, Agent, Commitment } from './schema/nodes.js';

async function main() {
  console.log('🚀 Summit Work Graph Demo\n');
  console.log('='.repeat(50));

  // Initialize core components
  const graphStore = new InMemoryGraphStore();
  const eventBus = new EventBus();
  const planner = new PlannerOrchestrator(graphStore);
  const market = new WorkMarket(graphStore);
  const policyEngine = new PolicyEngine(graphStore);
  const simulator = new PortfolioSimulator(graphStore);
  const metrics = new MetricsDashboard(graphStore);
  const triage = new AutoTriageEngine(graphStore);

  // Subscribe to events
  eventBus.subscribe({}, (event) => {
    console.log(`📡 Event: ${event.type}`);
  });

  // 1. Create an Intent
  console.log('\n📋 1. Creating Intent...');
  const intent: Intent = await graphStore.createNode({
    id: crypto.randomUUID(),
    type: 'intent',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'product-manager',
    title: 'Implement Real-time Collaboration Features',
    description: 'Add real-time presence, cursors, and collaborative editing to the platform. This will enable teams to work together more effectively.',
    source: 'customer',
    customer: 'Acme Corp',
    priority: 'P1',
    status: 'validated',
    evidence: ['Customer feedback survey', 'Competitor analysis'],
  });
  console.log(`   ✓ Intent created: "${intent.title}"`);

  // 2. Synthesize a Plan
  console.log('\n🎯 2. Synthesizing Plan from Intent...');
  const plan = await planner.synthesizePlan(intent, { maxTickets: 6 });
  console.log(`   ✓ Created ${plan.tickets.length} tickets`);
  console.log(`   ✓ Critical path: ${plan.criticalPath.length} items`);
  console.log(`   ✓ Estimated completion: ${plan.estimatedCompletion.toLocaleDateString()}`);
  console.log(`   ✓ Confidence: ${plan.confidence}%`);

  // 3. Auto-triage a ticket
  console.log('\n🏷️  3. Auto-triaging ticket...');
  const triageResult = await triage.triage({
    title: 'WebSocket connection drops after 30 seconds',
    description: 'Users report that the real-time connection disconnects randomly. Need to investigate and fix the keepalive mechanism.',
    sourceSystem: 'slack',
    reportedBy: 'customer-support',
  });
  console.log(`   ✓ Type: ${triageResult.ticketType}`);
  console.log(`   ✓ Priority: ${triageResult.priority}`);
  console.log(`   ✓ Area: ${triageResult.area ?? 'general'}`);
  console.log(`   ✓ Agent eligible: ${triageResult.agentEligible}`);
  console.log(`   ✓ Estimated effort: ${triageResult.estimate} hours`);

  // 4. Create Agents
  console.log('\n🤖 4. Registering Agents...');
  const agents: Agent[] = [];
  for (const agentDef of [
    { name: 'Claude-Coder-1', agentType: 'coding' as const, capabilities: ['typescript', 'react', 'node'] },
    { name: 'Claude-Coder-2', agentType: 'coding' as const, capabilities: ['python', 'django', 'postgresql'] },
    { name: 'Claude-Tester', agentType: 'testing' as const, capabilities: ['jest', 'playwright', 'coverage'] },
  ]) {
    const agent: Agent = await graphStore.createNode({
      id: crypto.randomUUID(),
      type: 'agent',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      name: agentDef.name,
      agentType: agentDef.agentType,
      status: 'available',
      capabilities: agentDef.capabilities,
      completedTasks: Math.floor(Math.random() * 50) + 10,
      successRate: 85 + Math.random() * 15,
      reputation: 70 + Math.random() * 30,
      currentLoad: 0,
      capacityUnits: 10,
      qualityScore: 80 + Math.random() * 20,
    });
    agents.push(agent);
    console.log(`   ✓ Registered: ${agent.name} (${agent.agentType})`);
  }

  // 5. Publish Work Contract
  console.log('\n📜 5. Publishing Work Contract...');
  const ticket = plan.tickets[0];
  const contract = await market.publishContract(ticket);
  console.log(`   ✓ Contract published: ${contract.id.slice(0, 8)}...`);

  // 6. Agents submit bids
  console.log('\n💰 6. Agents Bidding...');
  for (const agent of agents.filter(a => a.agentType === 'coding')) {
    const estimatedHours = 4 + Math.random() * 4;
    const bid = await market.submitBid({
      contractId: contract.id,
      agentId: agent.id,
      cost: 50 + Math.random() * 30,
      costUnit: 'credits',
      estimatedHours,
      estimatedQuality: 70 + Math.random() * 25,
      confidence: 0.7 + Math.random() * 0.25,
      approach: `Will implement using ${agent.capabilities.join(', ')}`,
      toolsUsed: agent.capabilities,
      riskFactors: [],
      canStartAt: new Date(),
      estimatedCompletion: new Date(Date.now() + estimatedHours * 60 * 60 * 1000),
    });
    console.log(`   ✓ ${agent.name} bid: ${bid.cost.toFixed(0)} credits, ${bid.estimatedHours.toFixed(1)}h`);
  }

  // 7. Evaluate bids
  console.log('\n⚖️  7. Evaluating Bids...');
  const evaluations = await market.evaluateBids(contract.id);
  console.log(`   ✓ ${evaluations.length} bids evaluated`);
  if (evaluations.length > 0) {
    const winner = evaluations[0];
    console.log(`   ✓ Winner: Total Score ${winner.score}`);
    console.log(`     - Time score: ${winner.factors.timeScore.toFixed(1)}`);
    console.log(`     - Quality score: ${winner.factors.qualityScore.toFixed(1)}`);
    console.log(`     - Reputation score: ${winner.factors.reputationScore.toFixed(1)}`);
  }

  // 8. Policy Check
  console.log('\n🛡️  8. Checking Policies...');
  const policyResult = await policyEngine.checkNode(ticket);
  console.log(`   ✓ Policies checked: ${policyResult.summary.total}`);
  console.log(`   ✓ Passed: ${policyResult.summary.passed}`);
  console.log(`   ✓ Warned: ${policyResult.summary.warned}`);
  console.log(`   ✓ Blocked: ${policyResult.summary.blocked}`);

  // 9. Create a Commitment
  console.log('\n🤝 9. Creating Commitment...');
  const commitment: Commitment = await graphStore.createNode({
    id: crypto.randomUUID(),
    type: 'commitment',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'sales',
    title: 'Real-time Collaboration for Acme Corp',
    description: 'Deliver real-time collaboration features by end of quarter',
    customer: 'Acme Corp',
    promisedTo: 'John Smith (CTO)',
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    status: 'active',
    confidence: 75,
    contractualSLA: true,
    escalationPath: ['engineering-lead', 'vp-engineering', 'cto'],
    linkedIntents: [intent.id],
  });
  console.log(`   ✓ Commitment: "${commitment.title}"`);
  console.log(`   ✓ Due: ${commitment.dueDate.toLocaleDateString()}`);
  console.log(`   ✓ Confidence: ${commitment.confidence}%`);

  // 10. Link tickets to commitment
  console.log('\n🔗 10. Linking tickets to commitment...');
  for (const t of plan.tickets) {
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'drives',
      sourceId: t.id,
      targetId: commitment.id,
      createdAt: new Date(),
      createdBy: 'planner',
      weight: 1,
    });
  }
  console.log(`   ✓ Linked ${plan.tickets.length} tickets`);

  // 11. Simulate Portfolio
  console.log('\n📊 11. Running Portfolio Simulation...');
  const simResult = await simulator.simulateCommitment(commitment.id);
  console.log(`   ✓ Delivery probability: ${(simResult.deliveryProbability * 100).toFixed(1)}%`);
  console.log(`   ✓ Expected delivery: ${simResult.expectedDeliveryDate.toLocaleDateString()}`);
  console.log(`   ✓ P50 date: ${simResult.p50DeliveryDate.toLocaleDateString()}`);
  console.log(`   ✓ P90 date: ${simResult.p90DeliveryDate.toLocaleDateString()}`);
  if (simResult.riskFactors.length > 0) {
    console.log(`   ⚠️  Risks: ${simResult.riskFactors.join(', ')}`);
  }
  if (simResult.recommendations.length > 0) {
    console.log(`   💡 Recommendations: ${simResult.recommendations.join(', ')}`);
  }

  // 12. Calculate Metrics
  console.log('\n📈 12. Calculating Engineering Metrics...');
  const dashboardMetrics = await metrics.getMetrics();
  console.log(`   ✓ Overall Health: ${Math.min(100, dashboardMetrics.health.overall).toFixed(0)}%`);
  console.log(`   ✓ Velocity Score: ${dashboardMetrics.health.breakdown.velocity.toFixed(0)}%`);
  console.log(`   ✓ Quality Score: ${dashboardMetrics.health.breakdown.quality.toFixed(0)}%`);
  console.log(`   ✓ Commitment Score: ${dashboardMetrics.health.breakdown.commitments.toFixed(0)}%`);
  console.log(`   ✓ Agent Health: ${Math.min(100, dashboardMetrics.health.breakdown.agentHealth).toFixed(0)}%`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Demo Complete!\n');
  console.log('Graph Contents:');

  const allNodes = await graphStore.getNodes<{ type: string }>({});
  const nodesByType: Record<string, number> = {};
  for (const node of allNodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(nodesByType)) {
    console.log(`   - ${type}: ${count}`);
  }

  const allEdges = await graphStore.getEdges({});
  console.log(`   - edges: ${allEdges.length}`);
}

main().catch(console.error);
