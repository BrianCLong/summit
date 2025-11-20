/**
 * Network Analysis Service Server
 */

import express from 'express';
import cors from 'cors';
import { NetworkService } from './NetworkService.js';

const app = express();
const port = process.env.PORT || 3100;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const networkService = new NetworkService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'network-analysis' });
});

// Create graph
app.post('/api/graphs', (req, res) => {
  try {
    const { id, nodes, edges, options } = req.body;
    const graph = networkService.createGraph(id, nodes, edges, options);

    res.json({
      success: true,
      graph: {
        id,
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get graph
app.get('/api/graphs/:id', (req, res) => {
  try {
    const graph = networkService.getGraph(req.params.id);
    if (!graph) {
      return res.status(404).json({ success: false, error: 'Graph not found' });
    }

    res.json({
      success: true,
      graph: {
        nodes: Array.from(graph.nodes.values()),
        edges: graph.edges
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate centrality
app.get('/api/graphs/:id/centrality', (req, res) => {
  try {
    const metric = req.query.metric as string | undefined;
    const result = networkService.calculateCentrality(req.params.id, metric);

    res.json({ success: true, centrality: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detect communities
app.post('/api/graphs/:id/communities', (req, res) => {
  try {
    const algorithm = req.body.algorithm || 'louvain';
    const result = networkService.detectCommunities(req.params.id, algorithm);

    res.json({ success: true, communities: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simulate diffusion
app.post('/api/graphs/:id/diffusion', (req, res) => {
  try {
    const { seedNodes, model } = req.body;
    const result = networkService.simulateDiffusion(req.params.id, seedNodes, model);

    res.json({ success: true, diffusion: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Predict links
app.get('/api/graphs/:id/link-prediction', (req, res) => {
  try {
    const method = (req.query.method as string) || 'ensemble';
    const topK = parseInt(req.query.topK as string) || 100;
    const result = networkService.predictLinks(req.params.id, method, topK);

    res.json({ success: true, predictions: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate network metrics
app.get('/api/graphs/:id/metrics', (req, res) => {
  try {
    const result = networkService.calculateNetworkMetrics(req.params.id);

    res.json({ success: true, metrics: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze motifs
app.get('/api/graphs/:id/motifs', (req, res) => {
  try {
    const result = networkService.analyzeMotifs(req.params.id);

    res.json({ success: true, motifs: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Apply layout
app.post('/api/graphs/:id/layout', (req, res) => {
  try {
    const { layoutType, parameters } = req.body;
    const result = networkService.applyLayout(req.params.id, layoutType, parameters);

    res.json({ success: true, layout: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detect bots
app.post('/api/graphs/:id/bots', (req, res) => {
  try {
    const { profiles } = req.body;
    const result = networkService.detectBots(req.params.id, profiles);

    res.json({ success: true, bots: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Identify echo chambers
app.get('/api/graphs/:id/echo-chambers', (req, res) => {
  try {
    const result = networkService.identifyEchoChambers(req.params.id);

    res.json({ success: true, echoChambers: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List graphs
app.get('/api/graphs', (req, res) => {
  try {
    const graphs = networkService.listGraphs();

    res.json({ success: true, graphs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete graph
app.delete('/api/graphs/:id', (req, res) => {
  try {
    const success = networkService.deleteGraph(req.params.id);

    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Network Analysis Service listening on port ${port}`);
});

export default app;
