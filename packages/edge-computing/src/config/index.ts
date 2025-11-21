/**
 * Edge computing configuration
 */
export interface EdgeConfig {
  orchestrator: {
    url: string;
    port: number;
    apiKey?: string;
  };
  node: {
    heartbeatInterval: number; // seconds
    healthCheckInterval: number; // seconds
    metricsInterval: number; // seconds
    syncInterval: number; // seconds
  };
  cluster: {
    autoScaling: {
      enabled: boolean;
      minNodes: number;
      maxNodes: number;
      targetCpuUtilization: number;
      targetMemoryUtilization: number;
      scaleUpThreshold: number;
      scaleDownThreshold: number;
      cooldownPeriod: number; // seconds
    };
    loadBalancing: {
      algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
      healthCheckInterval: number;
      healthCheckTimeout: number;
      healthCheckRetries: number;
    };
  };
  sync: {
    maxConcurrent: number;
    maxRetries: number;
    retryDelay: number; // ms
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    bandwidthLimit?: number; // bps
  };
  security: {
    tlsEnabled: boolean;
    mtlsEnabled: boolean;
    certificatePath?: string;
    keyPath?: string;
    caPath?: string;
    tokenExpiry: number; // seconds
  };
  storage: {
    dataPath: string;
    logsPath: string;
    modelsPath: string;
    maxLogSize: number; // bytes
    logRetentionDays: number;
  };
  ai: {
    inferenceTimeout: number; // ms
    maxBatchSize: number;
    modelCacheSizeMB: number;
    quantizationEnabled: boolean;
    accelerator?: 'cpu' | 'gpu' | 'tpu' | 'npu';
  };
  observability: {
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsPort: number;
    tracingEndpoint?: string;
  };
}

/**
 * Default edge configuration
 */
export const defaultEdgeConfig: EdgeConfig = {
  orchestrator: {
    url: 'http://localhost',
    port: 8080
  },
  node: {
    heartbeatInterval: 30,
    healthCheckInterval: 60,
    metricsInterval: 60,
    syncInterval: 300
  },
  cluster: {
    autoScaling: {
      enabled: false,
      minNodes: 1,
      maxNodes: 10,
      targetCpuUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      cooldownPeriod: 300
    },
    loadBalancing: {
      algorithm: 'round-robin',
      healthCheckInterval: 30,
      healthCheckTimeout: 5,
      healthCheckRetries: 3
    }
  },
  sync: {
    maxConcurrent: 5,
    maxRetries: 3,
    retryDelay: 1000,
    compressionEnabled: true,
    encryptionEnabled: true
  },
  security: {
    tlsEnabled: true,
    mtlsEnabled: false,
    tokenExpiry: 3600
  },
  storage: {
    dataPath: '/var/lib/edge/data',
    logsPath: '/var/log/edge',
    modelsPath: '/var/lib/edge/models',
    maxLogSize: 100 * 1024 * 1024, // 100MB
    logRetentionDays: 7
  },
  ai: {
    inferenceTimeout: 5000,
    maxBatchSize: 32,
    modelCacheSizeMB: 1024,
    quantizationEnabled: true,
    accelerator: 'cpu'
  },
  observability: {
    metricsEnabled: true,
    tracingEnabled: true,
    loggingLevel: 'info',
    metricsPort: 9090
  }
};

/**
 * Merge custom config with defaults
 */
export function mergeEdgeConfig(custom: Partial<EdgeConfig>): EdgeConfig {
  return {
    ...defaultEdgeConfig,
    ...custom,
    orchestrator: {
      ...defaultEdgeConfig.orchestrator,
      ...custom.orchestrator
    },
    node: {
      ...defaultEdgeConfig.node,
      ...custom.node
    },
    cluster: {
      autoScaling: {
        ...defaultEdgeConfig.cluster.autoScaling,
        ...custom.cluster?.autoScaling
      },
      loadBalancing: {
        ...defaultEdgeConfig.cluster.loadBalancing,
        ...custom.cluster?.loadBalancing
      }
    },
    sync: {
      ...defaultEdgeConfig.sync,
      ...custom.sync
    },
    security: {
      ...defaultEdgeConfig.security,
      ...custom.security
    },
    storage: {
      ...defaultEdgeConfig.storage,
      ...custom.storage
    },
    ai: {
      ...defaultEdgeConfig.ai,
      ...custom.ai
    },
    observability: {
      ...defaultEdgeConfig.observability,
      ...custom.observability
    }
  };
}

/**
 * Validate edge configuration
 */
export function validateEdgeConfig(config: EdgeConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.node.heartbeatInterval < 1) {
    errors.push('Heartbeat interval must be at least 1 second');
  }

  if (config.cluster.autoScaling.minNodes < 1) {
    errors.push('Minimum nodes must be at least 1');
  }

  if (config.cluster.autoScaling.maxNodes < config.cluster.autoScaling.minNodes) {
    errors.push('Maximum nodes must be greater than or equal to minimum nodes');
  }

  if (config.sync.maxConcurrent < 1) {
    errors.push('Max concurrent syncs must be at least 1');
  }

  if (config.ai.inferenceTimeout < 100) {
    errors.push('Inference timeout must be at least 100ms');
  }

  if (config.ai.maxBatchSize < 1) {
    errors.push('Max batch size must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
