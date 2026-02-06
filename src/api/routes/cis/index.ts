import { Router } from 'express';
import { CIGBuilder } from '../../../graphrag/cis/cig/builder';
import { PIEVectorEngine } from '../../../graphrag/cis/pie/vector';
import { CIESimulator } from '../../../agents/cis/game/equilibrium';
import { InterventionOptimizer } from '../../../graphrag/cis/interventions/optimizer';
import { TruthScanOracle } from '../../../connectors/cis/plugins/truthscan/mapper';
import { BlackbirdIntel } from '../../../connectors/cis/plugins/blackbird/mapper';

const router = Router();

// GET /cis/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Instantiate components per request to avoid state bleeding
    // In a real app, use dependency injection with request-scoped services
    const truthScan = new TruthScanOracle(process.env.TRUTHSCAN_API_KEY || 'mock-key');
    const blackbird = new BlackbirdIntel(process.env.BLACKBIRD_API_KEY || 'mock-key');
    const cigBuilder = new CIGBuilder();
    const pieEngine = new PIEVectorEngine();
    const simulator = new CIESimulator();
    const optimizer = new InterventionOptimizer();

    // 1. Fetch Data
    const narratives = await blackbird.fetchFeed();

    // 2. Build Graph
    const cig = cigBuilder.buildFromNarratives(narratives);

    // 3. Fetch Integrity Signals & Build Vectors
    const actors = cig.nodes.filter(n => n.type === 'Actor');

    await Promise.all(actors.map(async (actorNode) => {
        // Assume actorNode.properties.name or ID is used to query TruthScan
        // In reality, we might need a profile URL or content to scan.
        // For this demo, we scan the "name" as text content (mock behavior).
        const signal = await truthScan.analyze(actorNode.id, actorNode.properties.name);
        pieEngine.addSignal(actorNode.id, signal);
    }));

    // 4. Compute Vectors
    const pieVectors = actors.map(n => pieEngine.computeVector(n.id));

    // 5. Run Sim
    const state = simulator.run(cig, pieVectors);

    // 6. Get Interventions
    const bundles = optimizer.recommend(state);

    res.json({
      timestamp: new Date().toISOString(),
      cig_stats: {
        nodes: cig.nodes.length,
        edges: cig.edges.length
      },
      risk_distribution: state.risk_distribution,
      interventions: bundles
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
