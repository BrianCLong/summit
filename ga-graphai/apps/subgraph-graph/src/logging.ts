import pino from 'pino';
import type { GraphSubgraphConfig } from './config.js';

export function createLogger(config: GraphSubgraphConfig) {
  return pino({
    level: config.LOG_LEVEL,
    name: 'graph-subgraph'
  });
}
