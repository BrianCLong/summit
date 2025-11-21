const path = require('path');
const { spawn } = require('child_process');

const baseLogger = require('../config/logger').default || require('../config/logger');

class GraphAnomalyService {
  constructor(options = {}) {
    this.pythonPath = options.pythonPath || process.env.PYTHON_PATH || 'python3';
    this.scriptPath =
      options.scriptPath || path.resolve(__dirname, '..', '..', 'ml', 'models', 'graph_anomaly.py');
    this.logger = (baseLogger.child ? baseLogger.child({ name: 'GraphAnomalyService' }) : baseLogger);
  }

  async scoreTraversal(nodes = [], edges = [], options = {}) {
    const start = Date.now();
    const payload = {
      nodes: this._sanitizeNodes(nodes, options.entityId),
      edges: Array.isArray(edges) ? edges : [],
      metadata: {
        entityId: options.entityId || null,
        investigationId: options.investigationId || null,
        tenantId: options.tenantId || null,
        threshold: options.threshold || null,
        contamination: options.contamination || null,
      },
    };

    const args = [this.scriptPath];
    if (options.threshold) {
      args.push('--threshold', String(options.threshold));
    }
    if (options.contamination) {
      args.push('--contamination', String(options.contamination));
    }

    this.logger.info({
      entityId: options.entityId,
      investigationId: options.investigationId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
    }, 'Starting graph anomaly detection run');

    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('error', (error) => {
        this.logger.error({ error }, 'Failed to start anomaly detector python process');
        reject(error);
      });

      python.on('close', (code) => {
        const duration = Date.now() - start;
        if (code !== 0) {
          this.logger.error(
            {
              code,
              stderr,
              duration,
            },
            'Graph anomaly detection failed',
          );
          const err = new Error(`Graph anomaly detection process exited with code ${code}`);
          err.code = 'GRAPH_ANOMALY_PROCESS_FAILURE';
          err.details = stderr;
          reject(err);
          return;
        }

        try {
          const parsed = JSON.parse(stdout || '{}');
          this.logger.info({ duration, anomalyCount: parsed?.summary?.anomalyCount ?? 0 }, 'Graph anomaly detection complete');
          resolve(parsed);
        } catch (parseError) {
          this.logger.error({
            error: parseError,
            stdout,
            stderr,
          }, 'Failed to parse anomaly detection output');
          const err = new Error('Unable to parse anomaly detection output');
          err.code = 'GRAPH_ANOMALY_PARSE_FAILURE';
          err.details = stdout;
          reject(err);
        }
      });

      python.stdin.write(JSON.stringify(payload));
      python.stdin.end();
    });
  }

  _sanitizeNodes(nodes, entityId) {
    if (!Array.isArray(nodes)) return [];
    const sanitized = nodes.map((node) => ({
      id: node?.id ?? node?.nodeId ?? null,
      type: node?.type ?? null,
      label: node?.label ?? null,
      tags: Array.isArray(node?.tags) ? node.tags : [],
    })).filter((node) => node.id);

    if (entityId && !sanitized.some((node) => node.id === entityId)) {
      sanitized.push({ id: entityId, type: 'Entity', label: entityId, tags: [] });
    }

    return sanitized;
  }
}

module.exports = new GraphAnomalyService();
module.exports.GraphAnomalyService = GraphAnomalyService;
