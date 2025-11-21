import { Express, Request, Response } from 'express';
import { NetworkAnalyzer, VisualizationService } from '@intelgraph/supply-chain-mapper';
import { ComponentTracker } from '@intelgraph/component-tracker';
import { LogisticsTracker } from '@intelgraph/logistics-intel';
import { SupplyChainNode, SupplyChainRelationship, Component, Shipment } from '@intelgraph/supply-chain-types';

// In-memory storage (replace with database in production)
const nodes = new Map<string, SupplyChainNode>();
const relationships = new Map<string, SupplyChainRelationship>();
const components = new Map<string, Component>();
const shipments = new Map<string, Shipment>();

// Initialize services
const networkAnalyzer = new NetworkAnalyzer();
const visualizationService = new VisualizationService();
const componentTracker = new ComponentTracker();
const logisticsTracker = new LogisticsTracker();

export function setupRoutes(app: Express): void {
  // ============================================================================
  // Network and Mapping Routes
  // ============================================================================

  // Get network topology
  app.get('/api/network/topology', (req: Request, res: Response) => {
    const topology = networkAnalyzer.analyzeTopology(
      Array.from(nodes.values()),
      Array.from(relationships.values())
    );
    res.json(topology);
  });

  // Get visualization graph
  app.get('/api/network/visualization', (req: Request, res: Response) => {
    const layout = (req.query.layout as any) || 'force';
    const graph = visualizationService.toVisualizationGraph(
      Array.from(nodes.values()),
      Array.from(relationships.values()),
      layout
    );
    res.json(graph);
  });

  // Find critical path
  app.post('/api/network/critical-path', (req: Request, res: Response) => {
    const { sourceNodeId, targetNodeId } = req.body;
    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({ error: 'sourceNodeId and targetNodeId required' });
    }

    const criticalPath = networkAnalyzer.findCriticalPaths(
      sourceNodeId,
      targetNodeId,
      Array.from(nodes.values()),
      Array.from(relationships.values())
    );
    res.json(criticalPath);
  });

  // Analyze dependencies
  app.get('/api/network/dependencies/:nodeId', (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const dependencies = networkAnalyzer.analyzeDependencies(
      nodeId,
      Array.from(nodes.values()),
      Array.from(relationships.values())
    );
    res.json(dependencies);
  });

  // Get geographic distribution
  app.get('/api/network/geographic', (req: Request, res: Response) => {
    const distribution = visualizationService.getGeographicDistribution(
      Array.from(nodes.values())
    );
    res.json(distribution);
  });

  // Get dashboard data
  app.get('/api/dashboard', (req: Request, res: Response) => {
    const dashboard = visualizationService.getDashboardData(
      Array.from(nodes.values()),
      Array.from(relationships.values())
    );
    res.json(dashboard);
  });

  // ============================================================================
  // Node Management Routes
  // ============================================================================

  // Get all nodes
  app.get('/api/nodes', (req: Request, res: Response) => {
    const nodeList = Array.from(nodes.values());
    res.json({ nodes: nodeList, total: nodeList.length });
  });

  // Get node by ID
  app.get('/api/nodes/:id', (req: Request, res: Response) => {
    const node = nodes.get(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.json(node);
  });

  // Create node
  app.post('/api/nodes', (req: Request, res: Response) => {
    const nodeData = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    nodes.set(nodeData.id, nodeData);
    res.status(201).json(nodeData);
  });

  // Update node
  app.put('/api/nodes/:id', (req: Request, res: Response) => {
    const node = nodes.get(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    const updated = { ...node, ...req.body, updatedAt: new Date() };
    nodes.set(req.params.id, updated);
    res.json(updated);
  });

  // Delete node
  app.delete('/api/nodes/:id', (req: Request, res: Response) => {
    if (!nodes.has(req.params.id)) {
      return res.status(404).json({ error: 'Node not found' });
    }
    nodes.delete(req.params.id);
    res.status(204).send();
  });

  // ============================================================================
  // Relationship Management Routes
  // ============================================================================

  // Get all relationships
  app.get('/api/relationships', (req: Request, res: Response) => {
    const relList = Array.from(relationships.values());
    res.json({ relationships: relList, total: relList.length });
  });

  // Create relationship
  app.post('/api/relationships', (req: Request, res: Response) => {
    const relData = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    relationships.set(relData.id, relData);
    res.status(201).json(relData);
  });

  // ============================================================================
  // Component Routes
  // ============================================================================

  // Get component availability
  app.get('/api/components/:id/availability', async (req: Request, res: Response) => {
    const component = components.get(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const requiredQuantity = parseInt(req.query.quantity as string) || 1;
    const availability = await componentTracker.checkAvailability(
      req.params.id,
      requiredQuantity,
      [], // Would fetch from inventory database
      component
    );
    res.json(availability);
  });

  // Assess obsolescence risk
  app.get('/api/components/:id/obsolescence', (req: Request, res: Response) => {
    const component = components.get(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const risk = componentTracker.assessObsolescence(component);
    res.json(risk);
  });

  // ============================================================================
  // Logistics Routes
  // ============================================================================

  // Track shipment
  app.get('/api/shipments/:trackingNumber/track', async (req: Request, res: Response) => {
    const tracking = await logisticsTracker.trackShipment(req.params.trackingNumber);
    res.json(tracking);
  });

  // Optimize route
  app.post('/api/logistics/optimize-route', (req: Request, res: Response) => {
    const { origin, destination, requirements } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination required' });
    }

    const optimization = logisticsTracker.optimizeRoute(origin, destination, requirements || {});
    res.json(optimization);
  });

  // Monitor port congestion
  app.get('/api/logistics/ports/:portName/congestion', async (req: Request, res: Response) => {
    const congestion = await logisticsTracker.monitorPortCongestion(req.params.portName);
    res.json(congestion);
  });

  // ============================================================================
  // Search and Query Routes
  // ============================================================================

  // Search nodes
  app.get('/api/search/nodes', (req: Request, res: Response) => {
    const { q, type, tier, status, criticality } = req.query;
    let results = Array.from(nodes.values());

    if (q) {
      const query = (q as string).toLowerCase();
      results = results.filter(n => n.name.toLowerCase().includes(query));
    }
    if (type) {
      results = results.filter(n => n.type === type);
    }
    if (tier) {
      results = results.filter(n => n.tier === parseInt(tier as string));
    }
    if (status) {
      results = results.filter(n => n.status === status);
    }
    if (criticality) {
      results = results.filter(n => n.criticality === criticality);
    }

    res.json({ results, total: results.length });
  });
}
