"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const supply_chain_mapper_1 = require("@intelgraph/supply-chain-mapper");
const component_tracker_1 = require("@intelgraph/component-tracker");
const logistics_intel_1 = require("@intelgraph/logistics-intel");
// In-memory storage (replace with database in production)
const nodes = new Map();
const relationships = new Map();
const components = new Map();
const shipments = new Map();
// Initialize services
const networkAnalyzer = new supply_chain_mapper_1.NetworkAnalyzer();
const visualizationService = new supply_chain_mapper_1.VisualizationService();
const componentTracker = new component_tracker_1.ComponentTracker();
const logisticsTracker = new logistics_intel_1.LogisticsTracker();
function setupRoutes(app) {
    // ============================================================================
    // Network and Mapping Routes
    // ============================================================================
    // Get network topology
    app.get('/api/network/topology', (req, res) => {
        const topology = networkAnalyzer.analyzeTopology(Array.from(nodes.values()), Array.from(relationships.values()));
        res.json(topology);
    });
    // Get visualization graph
    app.get('/api/network/visualization', (req, res) => {
        const layout = req.query.layout || 'force';
        const graph = visualizationService.toVisualizationGraph(Array.from(nodes.values()), Array.from(relationships.values()), layout);
        res.json(graph);
    });
    // Find critical path
    app.post('/api/network/critical-path', (req, res) => {
        const { sourceNodeId, targetNodeId } = req.body;
        if (!sourceNodeId || !targetNodeId) {
            return res.status(400).json({ error: 'sourceNodeId and targetNodeId required' });
        }
        const criticalPath = networkAnalyzer.findCriticalPaths(sourceNodeId, targetNodeId, Array.from(nodes.values()), Array.from(relationships.values()));
        res.json(criticalPath);
    });
    // Analyze dependencies
    app.get('/api/network/dependencies/:nodeId', (req, res) => {
        const { nodeId } = req.params;
        const dependencies = networkAnalyzer.analyzeDependencies(nodeId, Array.from(nodes.values()), Array.from(relationships.values()));
        res.json(dependencies);
    });
    // Get geographic distribution
    app.get('/api/network/geographic', (req, res) => {
        const distribution = visualizationService.getGeographicDistribution(Array.from(nodes.values()));
        res.json(distribution);
    });
    // Get dashboard data
    app.get('/api/dashboard', (req, res) => {
        const dashboard = visualizationService.getDashboardData(Array.from(nodes.values()), Array.from(relationships.values()));
        res.json(dashboard);
    });
    // ============================================================================
    // Node Management Routes
    // ============================================================================
    // Get all nodes
    app.get('/api/nodes', (req, res) => {
        const nodeList = Array.from(nodes.values());
        res.json({ nodes: nodeList, total: nodeList.length });
    });
    // Get node by ID
    app.get('/api/nodes/:id', (req, res) => {
        const node = nodes.get(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }
        res.json(node);
    });
    // Create node
    app.post('/api/nodes', (req, res) => {
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
    app.put('/api/nodes/:id', (req, res) => {
        const node = nodes.get(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }
        const updated = { ...node, ...req.body, updatedAt: new Date() };
        nodes.set(req.params.id, updated);
        res.json(updated);
    });
    // Delete node
    app.delete('/api/nodes/:id', (req, res) => {
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
    app.get('/api/relationships', (req, res) => {
        const relList = Array.from(relationships.values());
        res.json({ relationships: relList, total: relList.length });
    });
    // Create relationship
    app.post('/api/relationships', (req, res) => {
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
    app.get('/api/components/:id/availability', async (req, res) => {
        const component = components.get(req.params.id);
        if (!component) {
            return res.status(404).json({ error: 'Component not found' });
        }
        const requiredQuantity = parseInt(req.query.quantity) || 1;
        const availability = await componentTracker.checkAvailability(req.params.id, requiredQuantity, [], // Would fetch from inventory database
        component);
        res.json(availability);
    });
    // Assess obsolescence risk
    app.get('/api/components/:id/obsolescence', (req, res) => {
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
    app.get('/api/shipments/:trackingNumber/track', async (req, res) => {
        const tracking = await logisticsTracker.trackShipment(req.params.trackingNumber);
        res.json(tracking);
    });
    // Optimize route
    app.post('/api/logistics/optimize-route', (req, res) => {
        const { origin, destination, requirements } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: 'origin and destination required' });
        }
        const optimization = logisticsTracker.optimizeRoute(origin, destination, requirements || {});
        res.json(optimization);
    });
    // Monitor port congestion
    app.get('/api/logistics/ports/:portName/congestion', async (req, res) => {
        const congestion = await logisticsTracker.monitorPortCongestion(req.params.portName);
        res.json(congestion);
    });
    // ============================================================================
    // Search and Query Routes
    // ============================================================================
    // Search nodes
    app.get('/api/search/nodes', (req, res) => {
        const { q, type, tier, status, criticality } = req.query;
        let results = Array.from(nodes.values());
        if (q) {
            const query = q.toLowerCase();
            results = results.filter(n => n.name.toLowerCase().includes(query));
        }
        if (type) {
            results = results.filter(n => n.type === type);
        }
        if (tier) {
            results = results.filter(n => n.tier === parseInt(tier));
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
