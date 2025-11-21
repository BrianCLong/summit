export interface PluginEvent {
  type: 'action' | 'feature' | 'error' | 'performance';
  name: string;
  pluginId: string;
  timestamp: Date;
  properties?: Record<string, any>;
}

export interface UsageStats {
  pluginId: string;
  totalEvents: number;
  actionCounts: Record<string, number>;
  errorCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PerformanceReport {
  pluginId: string;
  metrics: any;
  summary: {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
  };
  timestamp: Date;
}

export interface ErrorReport {
  pluginId: string;
  totalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: Array<{
    name: string;
    message: string;
    timestamp: Date;
  }>;
}
