// Edge Sync API for Conductor
// Provides endpoints for CRDT synchronization and offline operation management

import express from 'express';
import {
  crdtSyncEngine,
  CRDTNode,
  SyncRequest,
  SyncResponse,
} from './crdt-sync';
import { prometheusConductorMetrics } from '../observability/prometheus';
import crypto from 'crypto';

export const syncRouter = express.Router();

interface NodeRegistration {
  instanceId: string;
  location: string;
  version: string;
  capabilities: string[];
  syncPriority?: number;
}

interface SyncRequestBody {
  targetNodeId: string;
  maxOperations?: number;
  entityTypes?: string[];
  startTimestamp?: number;
  endTimestamp?: number;
}

interface OperationRequest {
  operation: 'create' | 'update' | 'delete' | 'merge';
  entityType: string;
  entityId: string;
  data: any;
  dependencies?: string[];
}

/**
 * Register edge node in the distributed network
 */
syncRouter.post('/nodes/register', async (req, res) => {
  const startTime = Date.now();

  try {
    const registration: NodeRegistration = req.body;
    const nodeId = (req.headers['x-node-id'] as string) || crypto.randomUUID();

    if (
      !registration.instanceId ||
      !registration.location ||
      !registration.version
    ) {
      return res.status(400).json({
        success: false,
        message: 'instanceId, location, and version are required',
      });
    }

    const node: Omit<CRDTNode, 'lastSeen'> = {
      nodeId,
      instanceId: registration.instanceId,
      location: registration.location,
      version: registration.version,
      capabilities: registration.capabilities || [],
      syncPriority: registration.syncPriority || 50,
    };

    await crdtSyncEngine.registerNode(node);

    const response = {
      success: true,
      nodeId,
      message: 'Node registered successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_node_registered',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_registration_time',
      response.processingTime,
    );

    res.status(201).json(response);
  } catch (error) {
    console.error('Node registration error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'edge_registration_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to register node',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Apply operation locally and prepare for sync
 */
syncRouter.post('/operations/apply', async (req, res) => {
  const startTime = Date.now();

  try {
    const operationRequest: OperationRequest = req.body;
    const nodeId = req.headers['x-node-id'] as string;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        message: 'x-node-id header is required',
      });
    }

    // Validation
    if (
      !operationRequest.operation ||
      !operationRequest.entityType ||
      !operationRequest.entityId
    ) {
      return res.status(400).json({
        success: false,
        message: 'operation, entityType, and entityId are required',
      });
    }

    const operationId = await crdtSyncEngine.applyOperation({
      timestamp: Date.now(),
      operation: operationRequest.operation,
      entityType: operationRequest.entityType,
      entityId: operationRequest.entityId,
      data: operationRequest.data,
      dependencies: operationRequest.dependencies || [],
    });

    const response = {
      success: true,
      operationId,
      message: 'Operation applied successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_operation_applied',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_operation_time',
      response.processingTime,
    );

    res.json(response);
  } catch (error) {
    console.error('Operation application error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'edge_operation_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to apply operation',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Initiate sync with another node
 */
syncRouter.post('/sync/initiate', async (req, res) => {
  const startTime = Date.now();

  try {
    const syncRequest: SyncRequestBody = req.body;
    const sourceNodeId = req.headers['x-node-id'] as string;

    if (!sourceNodeId) {
      return res.status(400).json({
        success: false,
        message: 'x-node-id header is required',
      });
    }

    if (!syncRequest.targetNodeId) {
      return res.status(400).json({
        success: false,
        message: 'targetNodeId is required',
      });
    }

    const syncResponse = await crdtSyncEngine.syncWithNode(
      syncRequest.targetNodeId,
      syncRequest.maxOperations || 1000,
    );

    const response = {
      success: true,
      sync: syncResponse,
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_sync_initiated',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_sync_time',
      response.processingTime,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_sync_operations',
      syncResponse.operations.length,
    );

    res.json(response);
  } catch (error) {
    console.error('Sync initiation error:', error);

    prometheusConductorMetrics.recordOperationalEvent('edge_sync_error', false);

    res.status(500).json({
      success: false,
      message: 'Failed to initiate sync',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Receive operations from another node
 */
syncRouter.post('/sync/receive', async (req, res) => {
  const startTime = Date.now();

  try {
    const { operations } = req.body;
    const targetNodeId = req.headers['x-node-id'] as string;

    if (!targetNodeId) {
      return res.status(400).json({
        success: false,
        message: 'x-node-id header is required',
      });
    }

    if (!Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        message: 'operations array is required',
      });
    }

    const conflicts = await crdtSyncEngine.receiveOperations(operations);

    const response = {
      success: true,
      operationsReceived: operations.length,
      conflictsDetected: conflicts.length,
      conflicts: conflicts,
      message:
        conflicts.length > 0
          ? `${operations.length} operations received with ${conflicts.length} conflicts`
          : `${operations.length} operations received successfully`,
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_operations_received',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_receive_time',
      response.processingTime,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_receive_conflicts',
      conflicts.length,
    );

    res.json(response);
  } catch (error) {
    console.error('Operation receive error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'edge_receive_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to receive operations',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get sync status for the current node
 */
syncRouter.get('/sync/status', async (req, res) => {
  try {
    const nodeId = req.headers['x-node-id'] as string;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        message: 'x-node-id header is required',
      });
    }

    const status = await crdtSyncEngine.getSyncStatus();

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Status retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sync status',
    });
  }
});

/**
 * Get list of active edge nodes
 */
syncRouter.get('/nodes', async (req, res) => {
  try {
    const { location, capability } = req.query;

    const status = await crdtSyncEngine.getSyncStatus();
    let nodes = status.activeNodes;

    // Filter by location if specified
    if (location) {
      nodes = nodes.filter((node) =>
        node.location.includes(location as string),
      );
    }

    // Filter by capability if specified
    if (capability) {
      nodes = nodes.filter((node) =>
        node.capabilities.includes(capability as string),
      );
    }

    res.json({
      success: true,
      nodes: nodes.map((node) => ({
        nodeId: node.nodeId,
        instanceId: node.instanceId,
        location: node.location,
        version: node.version,
        capabilities: node.capabilities,
        syncPriority: node.syncPriority,
        lastSeen: node.lastSeen,
      })),
      total: nodes.length,
    });
  } catch (error) {
    console.error('Node listing error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to list nodes',
    });
  }
});

/**
 * Force sync with all available nodes
 */
syncRouter.post('/sync/all', async (req, res) => {
  const startTime = Date.now();

  try {
    const sourceNodeId = req.headers['x-node-id'] as string;
    const { maxOperationsPerNode = 1000, parallelSync = true } = req.body;

    if (!sourceNodeId) {
      return res.status(400).json({
        success: false,
        message: 'x-node-id header is required',
      });
    }

    const status = await crdtSyncEngine.getSyncStatus();
    const targetNodes = status.activeNodes
      .filter((node) => node.nodeId !== sourceNodeId)
      .sort((a, b) => b.syncPriority - a.syncPriority); // Sync with higher priority nodes first

    const syncResults: Array<{
      nodeId: string;
      success: boolean;
      operationsSent: number;
      error?: string;
    }> = [];

    if (parallelSync) {
      // Parallel sync with all nodes
      const syncPromises = targetNodes.map(async (node) => {
        try {
          const syncResponse = await crdtSyncEngine.syncWithNode(
            node.nodeId,
            maxOperationsPerNode,
          );
          return {
            nodeId: node.nodeId,
            success: true,
            operationsSent: syncResponse.operations.length,
          };
        } catch (error) {
          return {
            nodeId: node.nodeId,
            success: false,
            operationsSent: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const results = await Promise.allSettled(syncPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          syncResults.push(result.value);
        } else {
          syncResults.push({
            nodeId: 'unknown',
            success: false,
            operationsSent: 0,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    } else {
      // Sequential sync with each node
      for (const node of targetNodes) {
        try {
          const syncResponse = await crdtSyncEngine.syncWithNode(
            node.nodeId,
            maxOperationsPerNode,
          );
          syncResults.push({
            nodeId: node.nodeId,
            success: true,
            operationsSent: syncResponse.operations.length,
          });
        } catch (error) {
          syncResults.push({
            nodeId: node.nodeId,
            success: false,
            operationsSent: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const totalOperationsSent = syncResults.reduce(
      (sum, result) => sum + result.operationsSent,
      0,
    );
    const successfulSyncs = syncResults.filter(
      (result) => result.success,
    ).length;

    const response = {
      success: successfulSyncs > 0,
      nodesSynced: successfulSyncs,
      totalNodes: targetNodes.length,
      totalOperationsSent,
      syncResults,
      message: `Synced with ${successfulSyncs}/${targetNodes.length} nodes`,
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_sync_all_completed',
      response.success,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_sync_all_time',
      response.processingTime,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'edge_sync_all_operations',
      totalOperationsSent,
    );

    res.json(response);
  } catch (error) {
    console.error('Sync all error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'edge_sync_all_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to sync with nodes',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Resolve conflicts manually
 */
syncRouter.post('/conflicts/resolve', async (req, res) => {
  const startTime = Date.now();

  try {
    const { conflictId, resolution, strategy } = req.body;

    if (!conflictId || !resolution) {
      return res.status(400).json({
        success: false,
        message: 'conflictId and resolution are required',
      });
    }

    // In a real implementation, you'd have a conflict resolution system
    // This is a simplified version for demonstration

    const response = {
      success: true,
      conflictId,
      resolution,
      strategy: strategy || 'manual',
      message: 'Conflict resolved successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'edge_conflict_resolved',
      true,
    );

    res.json(response);
  } catch (error) {
    console.error('Conflict resolution error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'edge_conflict_resolution_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to resolve conflict',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get offline operation statistics
 */
syncRouter.get('/stats/offline', async (req, res) => {
  try {
    const status = await crdtSyncEngine.getSyncStatus();

    const stats = {
      nodeId: status.nodeId,
      isOnline: status.activeNodes.length > 1,
      connectedNodes: status.activeNodes.length - 1, // Subtract self
      pendingOperations: status.pendingOperations,
      vectorClock: status.vectorClock,
      lastSyncTimes: status.lastSyncTimes,
      capabilities: {
        offlineMode: true,
        conflictResolution: true,
        crdtSync: true,
        edgeComputing: true,
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Offline stats error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offline statistics',
    });
  }
});

/**
 * Health check for edge sync service
 */
syncRouter.get('/health', async (req, res) => {
  try {
    const status = await crdtSyncEngine.getSyncStatus();
    const isHealthy =
      status.activeNodes.length > 0 && status.pendingOperations < 10000;

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      nodeId: status.nodeId,
      activeNodes: status.activeNodes.length,
      pendingOperations: status.pendingOperations,
      timestamp: Date.now(),
      service: 'edge-sync-api',
    });
  } catch (error) {
    console.error('Health check error:', error);

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Edge sync health check failed',
    });
  }
});

// Request logging middleware
syncRouter.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `Sync API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );

    prometheusConductorMetrics.recordOperationalMetric(
      'edge_api_request_duration',
      duration,
    );
    prometheusConductorMetrics.recordOperationalEvent(
      `edge_api_${req.method.toLowerCase()}`,
      res.statusCode < 400,
    );
  });

  next();
});

export default syncRouter;
