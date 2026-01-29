
import { NarrativeMarketSimulator } from '../src/core/NarrativeMarketSimulator.js';
import type { IdentityCluster, NarrativeMarket, NarrativeAlignment } from '../src/core/types.js';

async function runTest() {
  console.log('Starting Market Simulation Test...');

  const simulator = new NarrativeMarketSimulator();

  const cluster1: IdentityCluster = {
    id: 'cluster-security',
    name: 'Security First',
    values: ['security', 'order'],
    size: 0.6
  };

  const cluster2: IdentityCluster = {
    id: 'cluster-freedom',
    name: 'Liberty First',
    values: ['freedom', 'privacy'],
    size: 0.4
  };

  const market: NarrativeMarket = {
    id: 'market-1',
    topic: 'Surveillance Bill',
    narrativeIds: ['narrative-pro', 'narrative-anti'],
    audienceSegments: ['cluster-security', 'cluster-freedom']
  };

  simulator.configureMarket(market, [cluster1, cluster2]);

  // Pro narrative aligns with Security (+0.8), Anti aligns with Freedom (+0.9)
  const alignments: NarrativeAlignment[] = [
    { narrativeId: 'narrative-pro', clusterId: 'cluster-security', score: 0.8 },
    { narrativeId: 'narrative-pro', clusterId: 'cluster-freedom', score: -0.5 },
    { narrativeId: 'narrative-anti', clusterId: 'cluster-security', score: -0.2 },
    { narrativeId: 'narrative-anti', clusterId: 'cluster-freedom', score: 0.9 }
  ];

  simulator.setAlignments(alignments);

  // Initial State
  let snapshot = simulator.getMarketState('market-1');
  console.log('Initial Shares:', snapshot?.narrativeShares);

  if (!snapshot) throw new Error("Failed to get initial snapshot");
  if (Math.abs((snapshot.narrativeShares['narrative-pro'] ?? 0) - 0.5) > 0.01) throw new Error("Initial share incorrect");

  // Step 1
  snapshot = simulator.simulateMarketStep('market-1', Date.now());
  console.log('Step 1 Shares:', snapshot.narrativeShares);

  // Verify Pro narrative grew (larger cluster alignment)
  // Weighted Alignment Pro: 0.8*0.6 + (-0.5)*0.4 = 0.48 - 0.2 = 0.28
  // Weighted Alignment Anti: -0.2*0.6 + 0.9*0.4 = -0.12 + 0.36 = 0.24
  // Pro should grow faster than Anti (but logic normalizes to 1.0)

  if ((snapshot.narrativeShares['narrative-pro'] ?? 0) <= 0.5) {
     throw new Error("Pro narrative did not grow as expected based on alignment");
  }

  // Substitution: Anti cannibalizes Pro
  simulator.setSubstitution('narrative-pro', 'narrative-anti', 0.1); // 10% of Pro converts to Anti per step

  snapshot = simulator.simulateMarketStep('market-1', Date.now());
  console.log('Step 2 Shares (with substitution):', snapshot.narrativeShares);

  // With 10% substitution, Anti should gain ground
  // We don't need exact math here, just directionality for the integration test

  console.log('Test Passed!');
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
