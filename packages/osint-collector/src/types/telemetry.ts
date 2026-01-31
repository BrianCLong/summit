
export interface AccessFriction {
  sourceId: string;
  frictionLevel: 'none' | 'low' | 'medium' | 'high' | 'blocked';
  indicators: {
    captchaPresented: boolean;
    rateLimitTightening: boolean;
    domObfuscationDetected: boolean;
    uiDarkPatterns: boolean;
  };
  latencyDelta: number; // ms change from baseline
  timestamp: string;
}

export interface CollectorHealth {
  collectorId: string;
  status: 'healthy' | 'degraded' | 'critical';
  lastRunTimestamp: string;
  consecutiveFailures: number;
  frictionIndex: number; // 0-100 score of platform resistance
  resourceUsage: {
    cpu: number;
    memory: number;
    bandwidth: number;
  };
}
