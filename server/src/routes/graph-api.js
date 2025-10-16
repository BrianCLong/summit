/**
 * Graph API Routes - REST endpoints for the IntelGraph UI
 * Provides graph data and agent actions for the frontend visualization
 */

import express from 'express';

const router = express.Router();

// Simple logging for graph API
const graphLogger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
};

/**
 * GET /api/graph - Get graph visualization data
 * Returns nodes and edges for the frontend cytoscape visualization
 */
router.get('/graph', async (req, res) => {
  const startTime = Date.now();

  try {
    const { limit = 100, tenantId } = req.query;

    // Use tenant from auth context or query param
    const tenant = req.user?.tenantId || tenantId || 'default';

    // Generate sample graph data for UI development
    const nodes = generateSampleNodes(Math.min(parseInt(limit), 50));
    const edges = generateSampleEdges(
      nodes,
      Math.min(parseInt(limit) * 0.8, 40),
    );

    const response = {
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        tenant,
        processingTime: Date.now() - startTime,
      },
    };

    graphLogger.info('Graph data retrieved', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      tenant,
      processingTime: response.metadata.processingTime,
    });

    res.json(response);
  } catch (error) {
    graphLogger.error('Failed to retrieve graph data', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to retrieve graph data',
      message: error.message,
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * GET /api/agent-actions - Get agent activity timeline
 * Returns recent agent actions and analysis results for the timeline
 */
router.get('/agent-actions', async (req, res) => {
  const startTime = Date.now();

  try {
    const { limit = 50, tenantId } = req.query;
    const tenant = req.user?.tenantId || tenantId || 'default';

    // Generate sample agent actions for UI development
    const actions = generateSyntheticActions(Math.min(parseInt(limit), 20));

    const response = {
      events: actions,
      metadata: {
        total: actions.length,
        tenant,
        processingTime: Date.now() - startTime,
      },
    };

    graphLogger.info('Agent actions retrieved', {
      actionCount: actions.length,
      tenant,
      processingTime: response.metadata.processingTime,
    });

    res.json(response);
  } catch (error) {
    graphLogger.error('Failed to retrieve agent actions', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to retrieve agent actions',
      message: error.message,
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Generate realistic action results based on entity type
 */
function generateActionResult(entityType, entityName) {
  const results = {
    Person: [
      `Identified potential risk indicators for ${entityName}`,
      `Cross-referenced ${entityName} with known databases`,
      `Behavioral analysis completed for ${entityName}`,
      `Network associations mapped for ${entityName}`,
    ],
    Organization: [
      `Corporate structure analysis completed for ${entityName}`,
      `Financial risk assessment generated for ${entityName}`,
      `Regulatory compliance check completed for ${entityName}`,
      `Supply chain analysis initiated for ${entityName}`,
    ],
    Location: [
      `Geospatial analysis completed for ${entityName}`,
      `Activity patterns identified at ${entityName}`,
      `Risk assessment updated for ${entityName}`,
      `Infrastructure mapping completed for ${entityName}`,
    ],
    Document: [
      `Content analysis completed for ${entityName}`,
      `Key entities extracted from ${entityName}`,
      `Sentiment analysis performed on ${entityName}`,
      `Classification assigned to ${entityName}`,
    ],
  };

  const typeResults = results[entityType] || results['Document'];
  return typeResults[Math.floor(Math.random() * typeResults.length)];
}

/**
 * Generate synthetic actions for demo purposes
 */
function generateSyntheticActions(count) {
  const actions = [];
  const actionTypes = [
    'ML Model Training',
    'Pattern Recognition',
    'Anomaly Detection',
    'Network Analysis',
    'Risk Assessment',
    'Entity Resolution',
  ];

  const results = [
    'High-confidence match identified',
    'Anomalous pattern detected',
    'Risk score updated',
    'New connections discovered',
    'Classification confidence improved',
    'Duplicate entities merged',
  ];

  for (let i = 0; i < count; i++) {
    const actionType =
      actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const result = results[Math.floor(Math.random() * results.length)];

    actions.push({
      id: `synthetic_${i}_${Date.now()}`,
      action: actionType,
      confidence: Math.random() * 0.4 + 0.6,
      result,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Last hour
      entityId: `synthetic_entity_${i}`,
      actor: 'ai-agent',
      type: 'synthetic',
    });
  }

  return actions;
}

/**
 * Generate sample nodes for UI development
 */
function generateSampleNodes(count) {
  const nodeTypes = ['Person', 'Organization', 'Location', 'Document', 'Event'];
  const sampleNames = {
    Person: [
      'John Doe',
      'Jane Smith',
      'Robert Johnson',
      'Maria Garcia',
      'David Wilson',
    ],
    Organization: [
      'Acme Corp',
      'Global Industries',
      'Tech Solutions Inc',
      'Data Systems LLC',
      'Innovation Labs',
    ],
    Location: ['New York', 'London', 'Tokyo', 'Berlin', 'San Francisco'],
    Document: [
      'Intelligence Report #1',
      'Analysis Document',
      'Meeting Notes',
      'Project Plan',
      'Risk Assessment',
    ],
    Event: [
      'Conference 2024',
      'Board Meeting',
      'Security Incident',
      'Product Launch',
      'Annual Review',
    ],
  };

  const nodes = [];

  for (let i = 0; i < count; i++) {
    const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const names = sampleNames[nodeType];
    const name = names[Math.floor(Math.random() * names.length)];

    nodes.push({
      id: `node_${i}`,
      label: nodeType,
      properties: {
        name,
        text: name,
        title: name,
        deception_score: Math.random() * 0.3 + 0.1, // Low to medium deception scores
        tenantId: 'demo',
        type: nodeType,
        created: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    });
  }

  return nodes;
}

/**
 * Generate sample edges for UI development
 */
function generateSampleEdges(nodes, count) {
  const edgeTypes = [
    'CONNECTED_TO',
    'WORKS_FOR',
    'LOCATED_AT',
    'AUTHORED',
    'PARTICIPATED_IN',
    'OWNS',
    'MANAGES',
  ];
  const edges = [];

  for (let i = 0; i < count && i < nodes.length * 2; i++) {
    const sourceIndex = Math.floor(Math.random() * nodes.length);
    let targetIndex = Math.floor(Math.random() * nodes.length);

    // Avoid self-loops
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodes.length);
    }

    const edgeType = edgeTypes[Math.floor(Math.random() * edgeTypes.length)];

    edges.push({
      source: nodes[sourceIndex].id,
      target: nodes[targetIndex].id,
      type: edgeType,
      properties: {
        confidence: Math.random() * 0.4 + 0.6,
        created: new Date(
          Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    });
  }

  return edges;
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    service: 'graph-api',
  });
});

export default router;
