import React from 'react';

// SLO (Service Level Objective) types
export interface SLO {
  id: string;
  name: string;
  description: string;
  service: string;
  objective: number; // Target percentage (0-100)
  window: string; // Time window (e.g., '30d', '7d', '1h')
  sli: SLI; // Service Level Indicator
  errorBudget: ErrorBudget;
  alerting: AlertConfig;
  status: SLOStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SLI {
  type: SLIType;
  query: string;
  goodQuery?: string;
  totalQuery?: string;
  threshold?: number;
  ratioQueries?: {
    good: string;
    total: string;
  };
}

export enum SLIType {
  AVAILABILITY = 'availability',
  LATENCY = 'latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  CUSTOM = 'custom',
}

export interface ErrorBudget {
  total: number; // Total allowed errors in the window
  consumed: number; // Errors consumed so far
  remaining: number; // Remaining error budget
  consumedPercentage: number; // Percentage of budget consumed
  burnRate: number; // Current burn rate (errors/hour)
  exhaustionDate?: string; // Projected exhaustion date
  isHealthy: boolean; // Is within acceptable limits
}

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  severity: AlertSeverity;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  target: string;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // PromQL-like condition
  threshold: number;
  duration: string; // How long condition must be true
  severity: AlertSeverity;
  enabled: boolean;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface SLOStatus {
  currentSLI: number; // Current SLI value (0-100)
  objective: number; // Target objective (0-100)
  compliance: number; // Compliance percentage over window
  trend: 'improving' | 'degrading' | 'stable';
  lastUpdated: string;
  health: 'healthy' | 'warning' | 'critical';
}

// Grafana dashboard types
export interface GrafanaPanel {
  id: number;
  title: string;
  type: string;
  targets: GrafanaTarget[];
  fieldConfig: any;
  options: any;
  gridPos: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
}

export interface GrafanaTarget {
  expr: string;
  legendFormat?: string;
  refId: string;
  interval?: string;
  format?: string;
}

export interface GrafanaDashboard {
  id?: number;
  uid?: string;
  title: string;
  description: string;
  tags: string[];
  panels: GrafanaPanel[];
  templating: {
    list: GrafanaVariable[];
  };
  time: {
    from: string;
    to: string;
  };
  refresh: string;
  schemaVersion: number;
  version: number;
}

export interface GrafanaVariable {
  name: string;
  label: string;
  type: string;
  query?: string;
  options?: any[];
}

export class SLOManager {
  private endpoint: string;
  private grafanaUrl: string;
  private grafanaToken: string;

  constructor(
    options: {
      endpoint?: string;
      grafanaUrl?: string;
      grafanaToken?: string;
    } = {},
  ) {
    this.endpoint = options.endpoint || '/api/maestro/v1/slo';
    this.grafanaUrl =
      options.grafanaUrl || process.env.GRAFANA_URL || 'https://grafana.intelgraph.io';
    this.grafanaToken = options.grafanaToken || process.env.GRAFANA_TOKEN || '';
  }

  // SLO CRUD operations
  async createSLO(slo: Omit<SLO, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<SLO> {
    const response = await fetch(`${this.endpoint}/slos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slo),
    });

    if (!response.ok) {
      throw new Error(`Failed to create SLO: ${response.statusText}`);
    }

    return response.json();
  }

  async getSLOs(filters?: { service?: string; status?: string; limit?: number }): Promise<SLO[]> {
    const params = new URLSearchParams();
    if (filters?.service) params.append('service', filters.service);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.endpoint}/slos?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch SLOs: ${response.statusText}`);
    }

    return response.json();
  }

  async getSLO(id: string): Promise<SLO> {
    const response = await fetch(`${this.endpoint}/slos/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch SLO: ${response.statusText}`);
    }

    return response.json();
  }

  async updateSLO(id: string, updates: Partial<SLO>): Promise<SLO> {
    const response = await fetch(`${this.endpoint}/slos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update SLO: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteSLO(id: string): Promise<void> {
    const response = await fetch(`${this.endpoint}/slos/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete SLO: ${response.statusText}`);
    }
  }

  // SLI calculation
  async calculateSLI(
    slo: SLO,
    timeRange: { from: string; to: string },
  ): Promise<{
    value: number;
    datapoints: Array<[number, number]>; // [timestamp, value]
    metadata: {
      goodCount: number;
      totalCount: number;
      window: string;
    };
  }> {
    const response = await fetch(`${this.endpoint}/slos/${slo.id}/sli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeRange }),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate SLI: ${response.statusText}`);
    }

    return response.json();
  }

  // Error budget calculations
  calculateErrorBudget(slo: SLO, currentSLI: number): ErrorBudget {
    const windowMs = this.parseWindow(slo.window);
    const allowedFailureRate = (100 - slo.objective) / 100;

    // Calculate total allowed errors in the window
    const total = Math.floor(allowedFailureRate * 100); // Simplified calculation

    // Calculate consumed errors based on current SLI
    const failureRate = (100 - currentSLI) / 100;
    const consumed = Math.floor(failureRate * 100);

    const remaining = Math.max(0, total - consumed);
    const consumedPercentage = total > 0 ? (consumed / total) * 100 : 0;

    // Calculate burn rate (simplified)
    const burnRate = consumed > 0 ? consumed / (windowMs / (1000 * 60 * 60)) : 0; // errors per hour

    // Project exhaustion date
    let exhaustionDate: string | undefined;
    if (burnRate > 0 && remaining > 0) {
      const hoursToExhaustion = remaining / burnRate;
      exhaustionDate = new Date(Date.now() + hoursToExhaustion * 60 * 60 * 1000).toISOString();
    }

    const isHealthy = consumedPercentage < 80; // Healthy if less than 80% consumed

    return {
      total,
      consumed,
      remaining,
      consumedPercentage,
      burnRate,
      exhaustionDate,
      isHealthy,
    };
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([dhm])$/);
    if (!match) throw new Error(`Invalid window format: ${window}`);

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60 * 1000; // minutes
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      default:
        throw new Error(`Unknown window unit: ${unit}`);
    }
  }

  // Grafana integration
  async createGrafanaDashboard(slo: SLO): Promise<GrafanaDashboard> {
    const dashboard = this.generateSLODashboard(slo);

    const response = await fetch(`${this.grafanaUrl}/api/dashboards/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.grafanaToken}`,
      },
      body: JSON.stringify({
        dashboard,
        overwrite: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Grafana dashboard: ${response.statusText}`);
    }

    const result = await response.json();
    return { ...dashboard, id: result.id, uid: result.uid };
  }

  private generateSLODashboard(slo: SLO): GrafanaDashboard {
    const panels: GrafanaPanel[] = [
      {
        id: 1,
        title: 'SLO Compliance',
        type: 'stat',
        targets: [
          {
            expr: this.generateSLIQuery(slo.sli),
            refId: 'A',
            legendFormat: 'Current SLI',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
            thresholds: {
              steps: [
                { color: 'red', value: 0 },
                { color: 'yellow', value: slo.objective - 5 },
                { color: 'green', value: slo.objective },
              ],
            },
          },
        },
        options: {
          orientation: 'auto',
          reduceOptions: {
            values: false,
            calcs: ['lastNotNull'],
          },
        },
        gridPos: { h: 8, w: 12, x: 0, y: 0 },
      },
      {
        id: 2,
        title: 'Error Budget',
        type: 'gauge',
        targets: [
          {
            expr: `100 - (${this.generateSLIQuery(slo.sli)})`,
            refId: 'A',
            legendFormat: 'Error Budget Consumed',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100 - slo.objective,
            thresholds: {
              steps: [
                { color: 'green', value: 0 },
                { color: 'yellow', value: (100 - slo.objective) * 0.7 },
                { color: 'red', value: (100 - slo.objective) * 0.9 },
              ],
            },
          },
        },
        options: {
          showThresholdLabels: false,
          showThresholdMarkers: true,
        },
        gridPos: { h: 8, w: 12, x: 12, y: 0 },
      },
      {
        id: 3,
        title: 'SLI Trend',
        type: 'timeseries',
        targets: [
          {
            expr: this.generateSLIQuery(slo.sli),
            refId: 'A',
            legendFormat: 'SLI Value',
            interval: '1m',
          },
          {
            expr: `${slo.objective}`,
            refId: 'B',
            legendFormat: 'SLO Target',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
          },
        },
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
        },
        gridPos: { h: 8, w: 24, x: 0, y: 8 },
      },
      {
        id: 4,
        title: 'Error Budget Burn Rate',
        type: 'timeseries',
        targets: [
          {
            expr: `rate(${this.generateSLIQuery(slo.sli)}[5m]) * 60 * 60`, // Errors per hour
            refId: 'A',
            legendFormat: 'Burn Rate (errors/hour)',
            interval: '1m',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'short',
          },
        },
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
        },
        gridPos: { h: 8, w: 12, x: 0, y: 16 },
      },
      {
        id: 5,
        title: 'Alert Status',
        type: 'table',
        targets: [
          {
            expr: `ALERTS{service="${slo.service}"}`,
            refId: 'A',
            format: 'table',
          },
        ],
        fieldConfig: {
          defaults: {},
        },
        options: {
          showHeader: true,
        },
        gridPos: { h: 8, w: 12, x: 12, y: 16 },
      },
    ];

    return {
      title: `SLO: ${slo.name}`,
      description: `Service Level Objective dashboard for ${slo.service}`,
      tags: ['slo', 'maestro', slo.service],
      panels,
      templating: {
        list: [
          {
            name: 'service',
            label: 'Service',
            type: 'constant',
            query: slo.service,
          },
          {
            name: 'window',
            label: 'Time Window',
            type: 'constant',
            query: slo.window,
          },
        ],
      },
      time: {
        from: 'now-24h',
        to: 'now',
      },
      refresh: '1m',
      schemaVersion: 30,
      version: 1,
    };
  }

  private generateSLIQuery(sli: SLI): string {
    switch (sli.type) {
      case SLIType.AVAILABILITY:
        return `(${sli.ratioQueries?.good || sli.goodQuery}) / (${sli.ratioQueries?.total || sli.totalQuery}) * 100`;

      case SLIType.LATENCY:
        return `histogram_quantile(0.95, rate(${sli.query}[5m])) < ${sli.threshold}`;

      case SLIType.ERROR_RATE:
        return `(1 - (rate(${sli.goodQuery}[5m]) / rate(${sli.totalQuery}[5m]))) * 100`;

      case SLIType.THROUGHPUT:
        return `rate(${sli.query}[5m])`;

      case SLIType.CUSTOM:
        return sli.query;

      default:
        throw new Error(`Unknown SLI type: ${sli.type}`);
    }
  }

  // Alert management
  async createAlerts(slo: SLO): Promise<void> {
    const alerts = this.generateAlertRules(slo);

    for (const alert of alerts) {
      await fetch(`${this.endpoint}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    }
  }

  private generateAlertRules(slo: SLO): AlertRule[] {
    const baseQuery = this.generateSLIQuery(slo.sli);

    return [
      {
        id: `${slo.id}-sli-breach`,
        name: `${slo.name} - SLI Breach`,
        condition: `${baseQuery} < ${slo.objective}`,
        threshold: slo.objective,
        duration: '5m',
        severity: AlertSeverity.WARNING,
        enabled: slo.alerting.enabled,
      },
      {
        id: `${slo.id}-budget-exhaustion`,
        name: `${slo.name} - Error Budget Critical`,
        condition: `(100 - ${baseQuery}) > ${(100 - slo.objective) * 0.8}`,
        threshold: (100 - slo.objective) * 0.8,
        duration: '2m',
        severity: AlertSeverity.CRITICAL,
        enabled: slo.alerting.enabled,
      },
      {
        id: `${slo.id}-high-burn-rate`,
        name: `${slo.name} - High Burn Rate`,
        condition: `rate(${baseQuery}[10m]) > ${(100 - slo.objective) * 0.1}`,
        threshold: (100 - slo.objective) * 0.1,
        duration: '10m',
        severity: AlertSeverity.WARNING,
        enabled: slo.alerting.enabled,
      },
    ];
  }

  // Reporting
  async generateSLOReport(
    sloIds: string[],
    timeRange: { from: string; to: string },
  ): Promise<{
    summary: {
      totalSLOs: number;
      compliantSLOs: number;
      atRiskSLOs: number;
      averageCompliance: number;
    };
    slos: Array<{
      slo: SLO;
      compliance: number;
      errorBudget: ErrorBudget;
      trend: 'improving' | 'degrading' | 'stable';
    }>;
  }> {
    const slos = await Promise.all(sloIds.map((id) => this.getSLO(id)));
    const reports = await Promise.all(
      slos.map(async (slo) => {
        const sliData = await this.calculateSLI(slo, timeRange);
        const errorBudget = this.calculateErrorBudget(slo, sliData.value);

        return {
          slo,
          compliance: sliData.value,
          errorBudget,
          trend: this.calculateTrend(sliData.datapoints),
        };
      }),
    );

    const compliantSLOs = reports.filter((r) => r.compliance >= r.slo.objective).length;
    const atRiskSLOs = reports.filter((r) => r.errorBudget.consumedPercentage > 80).length;
    const averageCompliance = reports.reduce((sum, r) => sum + r.compliance, 0) / reports.length;

    return {
      summary: {
        totalSLOs: reports.length,
        compliantSLOs,
        atRiskSLOs,
        averageCompliance,
      },
      slos: reports,
    };
  }

  private calculateTrend(
    datapoints: Array<[number, number]>,
  ): 'improving' | 'degrading' | 'stable' {
    if (datapoints.length < 2) return 'stable';

    const recent = datapoints.slice(-Math.min(10, datapoints.length));
    const sum = recent.reduce((acc, [_, value], idx) => acc + value * (idx + 1), 0);
    const weightedSum = recent.reduce((acc, _, idx) => acc + (idx + 1), 0);
    const weightedAvg = sum / weightedSum;

    const earlierAvg =
      recent.slice(0, Math.floor(recent.length / 2)).reduce((acc, [_, value]) => acc + value, 0) /
      Math.floor(recent.length / 2);

    const diff = weightedAvg - earlierAvg;

    if (Math.abs(diff) < 1) return 'stable';
    return diff > 0 ? 'improving' : 'degrading';
  }
}

// Global SLO manager instance
export const sloManager = new SLOManager();

// React hook for SLO management
export const useSLO = () => {
  const [slos, setSLOs] = React.useState<SLO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSLOs = React.useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedSLOs = await sloManager.getSLOs(filters);
      setSLOs(fetchedSLOs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SLOs');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSLO = React.useCallback(async (sloData: any) => {
    try {
      const newSLO = await sloManager.createSLO(sloData);
      setSLOs((prev) => [...prev, newSLO]);
      return newSLO;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create SLO');
      throw err;
    }
  }, []);

  const updateSLO = React.useCallback(async (id: string, updates: Partial<SLO>) => {
    try {
      const updatedSLO = await sloManager.updateSLO(id, updates);
      setSLOs((prev) => prev.map((slo) => (slo.id === id ? updatedSLO : slo)));
      return updatedSLO;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update SLO');
      throw err;
    }
  }, []);

  const deleteSLO = React.useCallback(async (id: string) => {
    try {
      await sloManager.deleteSLO(id);
      setSLOs((prev) => prev.filter((slo) => slo.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SLO');
      throw err;
    }
  }, []);

  return {
    slos,
    loading,
    error,
    fetchSLOs,
    createSLO,
    updateSLO,
    deleteSLO,
    calculateSLI: sloManager.calculateSLI.bind(sloManager),
    generateReport: sloManager.generateSLOReport.bind(sloManager),
  };
};
