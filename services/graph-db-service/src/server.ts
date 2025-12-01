/**
 * Graph Database Service
 * REST API for graph operations
 */

import express, { type Application } from 'express';
import cors from 'cors';
import { GraphStorage } from '@intelgraph/graph-database';
import { QueryEngine } from '@intelgraph/graph-query';
import { ShortestPathAlgorithms, CentralityMeasures, CommunityDetection, GraphClustering } from '@intelgraph/graph-algorithms';
import { PatternMining } from '@intelgraph/relationship-mining';
import { LinkPredictor } from '@intelgraph/link-prediction';

const app: Application = express();
const port = process.env.GRAPH_DB_PORT || 3100;

// Initialize graph storage
const graphStorage = new GraphStorage({
  dataDir: './data/graph',
  cacheSize: 1024 * 1024 * 200, // 200MB cache
  enableCompression: true,
  writeAheadLog: true
});

// Initialize engines
const queryEngine = new QueryEngine(graphStorage);
const pathfinding = new ShortestPathAlgorithms(graphStorage);
const centrality = new CentralityMeasures(graphStorage);
const community = new CommunityDetection(graphStorage);
const clustering = new GraphClustering(graphStorage);
const patternMining = new PatternMining(graphStorage);
const linkPredictor = new LinkPredictor(graphStorage);

app.use(cors());
app.use(express.json());

// ==================== Node Operations ====================

app.post('/api/nodes', (req, res) => {
  try {
    const { labels, properties } = req.body;
    const node = graphStorage.createNode(labels, properties);
    res.json({ success: true, node });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/nodes/:id', (req, res) => {
  try {
    const node = graphStorage.getNode(req.params.id);
    if (node) {
      res.json({ success: true, node });
    } else {
      res.status(404).json({ success: false, error: 'Node not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.put('/api/nodes/:id', (req, res) => {
  try {
    const { properties } = req.body;
    const node = graphStorage.updateNode(req.params.id, properties);
    if (node) {
      res.json({ success: true, node });
    } else {
      res.status(404).json({ success: false, error: 'Node not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.delete('/api/nodes/:id', (req, res) => {
  try {
    const success = graphStorage.deleteNode(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/nodes/label/:label', (req, res) => {
  try {
    const nodes = graphStorage.getNodesByLabel(req.params.label);
    res.json({ success: true, nodes, count: nodes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Edge Operations ====================

app.post('/api/edges', (req, res) => {
  try {
    const { sourceId, targetId, type, properties, weight } = req.body;
    const edge = graphStorage.createEdge(sourceId, targetId, type, properties, weight);
    if (edge) {
      res.json({ success: true, edge });
    } else {
      res.status(400).json({ success: false, error: 'Invalid node IDs' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/edges/:id', (req, res) => {
  try {
    const edge = graphStorage.getEdge(req.params.id);
    if (edge) {
      res.json({ success: true, edge });
    } else {
      res.status(404).json({ success: false, error: 'Edge not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/edges/type/:type', (req, res) => {
  try {
    const edges = graphStorage.getEdgesByType(req.params.type);
    res.json({ success: true, edges, count: edges.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.delete('/api/edges/:id', (req, res) => {
  try {
    const success = graphStorage.deleteEdge(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Query Operations ====================

app.post('/api/query/cypher', (req, res) => {
  try {
    const { query } = req.body;
    const result = queryEngine.executeCypher(query);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/query/explain', (req, res) => {
  try {
    const { query, language } = req.body;
    const plan = queryEngine.explain(query, language || 'cypher');
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Graph Algorithms ====================

app.post('/api/algorithms/shortest-path', (req, res) => {
  try {
    const { sourceId, targetId, algorithm } = req.body;

    let path;
    switch (algorithm) {
      case 'astar':
        path = pathfinding.aStar(sourceId, targetId, (a, b) => 1);
        break;
      case 'bellman-ford':
        path = pathfinding.bellmanFord(sourceId, targetId);
        break;
      default:
        path = pathfinding.dijkstra(sourceId, targetId);
    }

    res.json({ success: true, path });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/algorithms/centrality/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { k } = req.body;

    let scores;
    switch (type) {
      case 'pagerank':
        scores = centrality.pageRank();
        break;
      case 'betweenness':
        scores = centrality.betweennessCentrality();
        break;
      case 'closeness':
        scores = centrality.closenessCentrality();
        break;
      case 'eigenvector':
        scores = centrality.eigenvectorCentrality();
        break;
      case 'degree':
        scores = centrality.degreeCentrality();
        break;
      default:
        scores = centrality.pageRank();
    }

    const topK = k ? centrality.getTopK(scores, k) : Array.from(scores.entries()).map(([nodeId, score]) => ({ nodeId, score }));
    res.json({ success: true, centrality: topK });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/algorithms/community-detection/:algorithm', (req, res) => {
  try {
    const { algorithm } = req.params;

    let communities;
    switch (algorithm) {
      case 'louvain':
        communities = community.louvain();
        break;
      case 'label-propagation':
        communities = community.labelPropagation();
        break;
      case 'connected-components':
        communities = community.connectedComponents();
        break;
      default:
        communities = community.louvain();
    }

    const result = community.getCommunities(communities);
    const modularity = community.calculateModularity(communities);

    res.json({ success: true, communities: result, modularity });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/algorithms/clustering', (req, res) => {
  try {
    const metrics = clustering.getClusteringMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/algorithms/cliques', (req, res) => {
  try {
    const { k } = req.query;
    const cliques = k ? clustering.findKCliques(parseInt(k as string)) : clustering.findMaximalCliques();
    res.json({ success: true, cliques: cliques.slice(0, 100) }); // Limit results
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Pattern Mining ====================

app.post('/api/mining/patterns', (req, res) => {
  try {
    const { minSupport, maxSize } = req.body;
    const patterns = patternMining.frequentSubgraphs(minSupport || 0.1, maxSize || 5);
    res.json({ success: true, patterns });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/mining/motifs', (req, res) => {
  try {
    const motifs = patternMining.detectMotifs();
    res.json({ success: true, motifs });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/mining/anomalies', (req, res) => {
  try {
    const { threshold } = req.body;
    const anomalies = patternMining.detectAnomalousRelationships(threshold || 0.7);
    res.json({ success: true, anomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Link Prediction ====================

app.post('/api/prediction/link', (req, res) => {
  try {
    const { sourceId, targetId } = req.body;
    const prediction = linkPredictor.ensemblePrediction(sourceId, targetId);
    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/prediction/node-links', (req, res) => {
  try {
    const { nodeId, k } = req.body;
    const predictions = linkPredictor.predictLinksForNode(nodeId, k || 10);
    res.json({ success: true, predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/prediction/missing-links', (req, res) => {
  try {
    const { threshold, maxPredictions } = req.body;
    const predictions = linkPredictor.predictMissingLinks(threshold || 0.5, maxPredictions || 100);
    res.json({ success: true, predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Graph Statistics ====================

app.get('/api/stats', (req, res) => {
  try {
    const stats = graphStorage.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/neighbors/:nodeId', (req, res) => {
  try {
    const { direction } = req.query;
    const neighbors = graphStorage.getNeighbors(
      req.params.nodeId,
      (direction as 'in' | 'out' | 'both') || 'both'
    );
    res.json({ success: true, neighbors, count: neighbors.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== Import/Export ====================

app.get('/api/export', (req, res) => {
  try {
    const data = graphStorage.exportGraph();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const { data } = req.body;
    graphStorage.importGraph(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.delete('/api/clear', (req, res) => {
  try {
    graphStorage.clear();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'graph-database',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Graph Database Service running on port ${port}`);
  console.log(`API endpoints available at http://localhost:${port}/api`);
});

export { app, graphStorage, queryEngine };
