import { EventEmitter } from 'events';
import { RedisService as RedisCache } from '../cache/redis';

interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'map' | 'timeline' | 'network';
  config: any;
  position: { x: number; y: number; width: number; height: number };
  refreshInterval: number;
  dataSource: string;
  filters: Record<string, any>;
  permissions: string[];
}

interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'sankey' | 'treemap';
  title: string;
  data: any[];
  options: any;
  metadata: {
    lastUpdated: Date;
    dataPoints: number;
    refreshRate: number;
  };
}

interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  category:
    | 'threat'
    | 'investigation'
    | 'performance'
    | 'collaboration'
    | 'security';
  widgets: string[];
  schedule: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'dashboard' | 'pdf' | 'excel' | 'json';
  createdBy: string;
  createdAt: Date;
}

interface ThreatIntelMetrics {
  totalIOCs: number;
  activeThreats: number;
  resolvedThreats: number;
  threatSeverityDistribution: Record<string, number>;
  topThreatTypes: Array<{ type: string; count: number }>;
  geographicDistribution: Array<{ country: string; threatCount: number }>;
  timeSeriesData: Array<{ timestamp: Date; threatCount: number }>;
}

interface InvestigationMetrics {
  totalInvestigations: number;
  activeInvestigations: number;
  completedInvestigations: number;
  avgCompletionTime: number;
  investigationsByStatus: Record<string, number>;
  evidenceMetrics: {
    totalEvidence: number;
    evidenceByType: Record<string, number>;
  };
  findingsMetrics: {
    totalFindings: number;
    findingsBySeverity: Record<string, number>;
  };
}

export class AnalyticsDashboardService extends EventEmitter {
  private widgets: Map<string, DashboardWidget> = new Map();
  private charts: Map<string, ChartData> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private cache: RedisCache;
  private dataUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.cache = new RedisCache();
    this.initializeDefaultDashboard();
    this.startDataRefresh();
  }

  private initializeDefaultDashboard(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'threat-overview',
        title: 'Threat Intelligence Overview',
        type: 'metric',
        config: {
          metrics: ['total_iocs', 'active_threats', 'threat_severity'],
          colorScheme: 'red',
        },
        position: { x: 0, y: 0, width: 4, height: 2 },
        refreshInterval: 30000,
        dataSource: 'threat-metrics',
        filters: {},
        permissions: ['read:analytics'],
      },
      {
        id: 'investigation-timeline',
        title: 'Investigation Activity Timeline',
        type: 'timeline',
        config: {
          timeRange: '7d',
          granularity: 'hour',
          showEvents: true,
        },
        position: { x: 4, y: 0, width: 8, height: 3 },
        refreshInterval: 60000,
        dataSource: 'investigation-timeline',
        filters: {},
        permissions: ['read:investigations'],
      },
      {
        id: 'network-topology',
        title: 'Entity Relationship Network',
        type: 'network',
        config: {
          layout: 'force-directed',
          nodeLimit: 100,
          showLabels: true,
          clustering: true,
        },
        position: { x: 0, y: 2, width: 6, height: 4 },
        refreshInterval: 120000,
        dataSource: 'network-data',
        filters: {},
        permissions: ['read:graph'],
      },
      {
        id: 'geographic-threats',
        title: 'Geographic Threat Distribution',
        type: 'map',
        config: {
          mapType: 'world',
          heatmapEnabled: true,
          clusteringEnabled: true,
        },
        position: { x: 6, y: 2, width: 6, height: 4 },
        refreshInterval: 300000,
        dataSource: 'geo-threats',
        filters: {},
        permissions: ['read:geo-intel'],
      },
      {
        id: 'performance-metrics',
        title: 'System Performance Dashboard',
        type: 'chart',
        config: {
          chartType: 'line',
          metrics: ['response_time', 'memory_usage', 'cache_hit_rate'],
          timeRange: '24h',
        },
        position: { x: 0, y: 6, width: 12, height: 3 },
        refreshInterval: 30000,
        dataSource: 'performance-data',
        filters: {},
        permissions: ['read:system'],
      },
    ];

    defaultWidgets.forEach((widget) => {
      this.widgets.set(widget.id, widget);
    });

    console.log(
      '[ANALYTICS] Initialized dashboard with',
      defaultWidgets.length,
      'widgets',
    );
  }

  private startDataRefresh(): void {
    this.dataUpdateInterval = setInterval(() => {
      this.refreshAllData();
    }, 30000); // Refresh every 30 seconds

    // Initial data load
    this.refreshAllData();
  }

  private async refreshAllData(): Promise<void> {
    try {
      await Promise.all([
        this.refreshThreatMetrics(),
        this.refreshInvestigationMetrics(),
        this.refreshNetworkData(),
        this.refreshPerformanceMetrics(),
        this.refreshGeoThreatData(),
      ]);

      this.emit('data-refreshed', {
        timestamp: new Date(),
        widgets: this.widgets.size,
        charts: this.charts.size,
      });
    } catch (error) {
      console.error('[ANALYTICS] Data refresh error:', error);
      this.emit('refresh-error', error);
    }
  }

  private async refreshThreatMetrics(): Promise<void> {
    const metrics: ThreatIntelMetrics = {
      totalIOCs: Math.floor(Math.random() * 5000) + 1000,
      activeThreats: Math.floor(Math.random() * 200) + 50,
      resolvedThreats: Math.floor(Math.random() * 800) + 300,
      threatSeverityDistribution: {
        critical: Math.floor(Math.random() * 50) + 10,
        high: Math.floor(Math.random() * 100) + 30,
        medium: Math.floor(Math.random() * 150) + 50,
        low: Math.floor(Math.random() * 200) + 80,
      },
      topThreatTypes: [
        { type: 'Malware', count: Math.floor(Math.random() * 300) + 100 },
        { type: 'Phishing', count: Math.floor(Math.random() * 250) + 80 },
        {
          type: 'Command & Control',
          count: Math.floor(Math.random() * 200) + 60,
        },
        {
          type: 'Data Exfiltration',
          count: Math.floor(Math.random() * 150) + 40,
        },
        {
          type: 'Lateral Movement',
          count: Math.floor(Math.random() * 100) + 30,
        },
      ],
      geographicDistribution: [
        { country: 'US', threatCount: Math.floor(Math.random() * 500) + 200 },
        { country: 'CN', threatCount: Math.floor(Math.random() * 400) + 150 },
        { country: 'RU', threatCount: Math.floor(Math.random() * 350) + 120 },
        { country: 'KP', threatCount: Math.floor(Math.random() * 200) + 80 },
        { country: 'IR', threatCount: Math.floor(Math.random() * 180) + 70 },
      ],
      timeSeriesData: this.generateTimeSeriesData(24, 'hour'),
    };

    const chartData: ChartData = {
      id: 'threat-metrics-chart',
      type: 'bar',
      title: 'Threat Severity Distribution',
      data: Object.entries(metrics.threatSeverityDistribution).map(
        ([severity, count]) => ({
          label: severity.charAt(0).toUpperCase() + severity.slice(1),
          value: count,
          color: this.getSeverityColor(severity),
        }),
      ),
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true },
        },
      },
      metadata: {
        lastUpdated: new Date(),
        dataPoints: Object.keys(metrics.threatSeverityDistribution).length,
        refreshRate: 30,
      },
    };

    this.charts.set('threat-metrics', chartData);
    await this.cache.set(
      'analytics:threat-metrics',
      JSON.stringify(metrics),
      300,
    );
  }

  private async refreshInvestigationMetrics(): Promise<void> {
    const metrics: InvestigationMetrics = {
      totalInvestigations: Math.floor(Math.random() * 1000) + 500,
      activeInvestigations: Math.floor(Math.random() * 100) + 20,
      completedInvestigations: Math.floor(Math.random() * 800) + 400,
      avgCompletionTime: Math.floor(Math.random() * 72) + 24, // hours
      investigationsByStatus: {
        open: Math.floor(Math.random() * 50) + 10,
        in_progress: Math.floor(Math.random() * 80) + 20,
        under_review: Math.floor(Math.random() * 30) + 5,
        closed: Math.floor(Math.random() * 700) + 300,
      },
      evidenceMetrics: {
        totalEvidence: Math.floor(Math.random() * 5000) + 2000,
        evidenceByType: {
          document: Math.floor(Math.random() * 1000) + 500,
          image: Math.floor(Math.random() * 800) + 400,
          video: Math.floor(Math.random() * 300) + 100,
          audio: Math.floor(Math.random() * 200) + 50,
          digital: Math.floor(Math.random() * 1500) + 800,
        },
      },
      findingsMetrics: {
        totalFindings: Math.floor(Math.random() * 2000) + 1000,
        findingsBySeverity: {
          critical: Math.floor(Math.random() * 100) + 20,
          high: Math.floor(Math.random() * 200) + 50,
          medium: Math.floor(Math.random() * 400) + 150,
          low: Math.floor(Math.random() * 600) + 300,
          informational: Math.floor(Math.random() * 800) + 400,
        },
      },
    };

    const timelineChart: ChartData = {
      id: 'investigation-timeline',
      type: 'line',
      title: 'Investigation Activity Over Time',
      data: this.generateTimeSeriesData(30, 'day').map((point) => ({
        x: point.timestamp,
        y: point.threatCount,
        label: 'Investigations',
      })),
      options: {
        responsive: true,
        scales: {
          x: { type: 'time', time: { unit: 'day' } },
          y: { beginAtZero: true },
        },
      },
      metadata: {
        lastUpdated: new Date(),
        dataPoints: 30,
        refreshRate: 60,
      },
    };

    this.charts.set('investigation-timeline', timelineChart);
    await this.cache.set(
      'analytics:investigation-metrics',
      JSON.stringify(metrics),
      300,
    );
  }

  private async refreshNetworkData(): Promise<void> {
    const networkData = {
      nodes: this.generateNetworkNodes(100),
      edges: this.generateNetworkEdges(200),
      clusters: this.generateClusters(8),
      metrics: {
        density: Math.random() * 0.3,
        clustering: Math.random() * 0.8,
        avgDegree: Math.random() * 10 + 2,
      },
    };

    await this.cache.set(
      'analytics:network-data',
      JSON.stringify(networkData),
      300,
    );
  }

  private async refreshPerformanceMetrics(): Promise<void> {
    const performanceData = {
      responseTime: this.generateTimeSeriesData(24, 'hour', 'response_time'),
      memoryUsage: this.generateTimeSeriesData(24, 'hour', 'memory'),
      cacheHitRate: this.generateTimeSeriesData(24, 'hour', 'cache_hit'),
      errorRate: this.generateTimeSeriesData(24, 'hour', 'error_rate'),
      throughput: this.generateTimeSeriesData(24, 'hour', 'throughput'),
    };

    const performanceChart: ChartData = {
      id: 'performance-chart',
      type: 'line',
      title: 'System Performance Metrics',
      data: {
        datasets: [
          {
            label: 'Response Time (ms)',
            data: performanceData.responseTime,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1,
          },
          {
            label: 'Memory Usage (%)',
            data: performanceData.memoryUsage,
            borderColor: 'rgb(54, 162, 235)',
            tension: 0.1,
          },
          {
            label: 'Cache Hit Rate (%)',
            data: performanceData.cacheHitRate,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      } as any,
      options: {
        responsive: true,
        interaction: { intersect: false },
        scales: {
          x: { type: 'time' },
          y: { beginAtZero: true },
        },
      },
      metadata: {
        lastUpdated: new Date(),
        dataPoints: 24,
        refreshRate: 30,
      },
    };

    this.charts.set('performance-metrics', performanceChart);
    await this.cache.set(
      'analytics:performance-data',
      JSON.stringify(performanceData),
      300,
    );
  }

  private async refreshGeoThreatData(): Promise<void> {
    const geoData = {
      heatmapData: [
        { lat: 39.9042, lng: 116.4074, weight: Math.random() * 100 }, // Beijing
        { lat: 55.7558, lng: 37.6173, weight: Math.random() * 100 }, // Moscow
        { lat: 40.7128, lng: -74.006, weight: Math.random() * 100 }, // New York
        { lat: 51.5074, lng: -0.1278, weight: Math.random() * 100 }, // London
        { lat: 35.6762, lng: 139.6503, weight: Math.random() * 100 }, // Tokyo
        { lat: 37.7749, lng: -122.4194, weight: Math.random() * 100 }, // San Francisco
      ],
      clusters: [
        {
          lat: 40.7128,
          lng: -74.006,
          count: Math.floor(Math.random() * 50) + 10,
        },
        {
          lat: 51.5074,
          lng: -0.1278,
          count: Math.floor(Math.random() * 40) + 8,
        },
        {
          lat: 35.6762,
          lng: 139.6503,
          count: Math.floor(Math.random() * 35) + 7,
        },
      ],
    };

    await this.cache.set('analytics:geo-threats', JSON.stringify(geoData), 300);
  }

  private generateTimeSeriesData(
    points: number,
    unit: 'hour' | 'day',
    type: string = 'threat',
  ): Array<{ timestamp: Date; threatCount: number }> {
    const data = [];
    const now = new Date();
    const interval = unit === 'hour' ? 3600000 : 86400000;

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * interval);
      let value;

      switch (type) {
        case 'response_time':
          value = Math.random() * 500 + 100;
          break;
        case 'memory':
          value = Math.random() * 40 + 40;
          break;
        case 'cache_hit':
          value = Math.random() * 20 + 75;
          break;
        case 'error_rate':
          value = Math.random() * 5;
          break;
        case 'throughput':
          value = Math.random() * 1000 + 500;
          break;
        default:
          value = Math.floor(Math.random() * 50) + 10;
      }

      data.push({ timestamp, threatCount: value });
    }

    return data;
  }

  private generateNetworkNodes(count: number): any[] {
    const nodeTypes = [
      'Person',
      'Organization',
      'Location',
      'Event',
      'Document',
    ];
    const nodes = [];

    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `node_${i}`,
        label: `Node ${i}`,
        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        size: Math.random() * 20 + 5,
        x: Math.random() * 800,
        y: Math.random() * 600,
        color: this.getNodeColor(
          nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        ),
      });
    }

    return nodes;
  }

  private generateNetworkEdges(count: number): any[] {
    const edges = [];
    const relationTypes = [
      'CONNECTED_TO',
      'RELATED_TO',
      'INVOLVED_IN',
      'LOCATED_AT',
      'OWNS',
    ];

    for (let i = 0; i < count; i++) {
      edges.push({
        id: `edge_${i}`,
        source: `node_${Math.floor(Math.random() * 100)}`,
        target: `node_${Math.floor(Math.random() * 100)}`,
        type: relationTypes[Math.floor(Math.random() * relationTypes.length)],
        weight: Math.random() * 10 + 1,
      });
    }

    return edges;
  }

  private generateClusters(count: number): any[] {
    const clusters = [];

    for (let i = 0; i < count; i++) {
      clusters.push({
        id: `cluster_${i}`,
        label: `Cluster ${i}`,
        nodeCount: Math.floor(Math.random() * 20) + 5,
        density: Math.random(),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      });
    }

    return clusters;
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d',
    };
    return colors[severity as keyof typeof colors] || '#6b7280';
  }

  private getNodeColor(type: string): string {
    const colors = {
      Person: '#3b82f6',
      Organization: '#ef4444',
      Location: '#22c55e',
      Event: '#a855f7',
      Document: '#f59e0b',
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  public async createCustomReport(
    report: Omit<AnalyticsReport, 'id' | 'createdAt'>,
  ): Promise<AnalyticsReport> {
    const newReport: AnalyticsReport = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.reports.set(newReport.id, newReport);
    await this.cache.set(
      `analytics:report:${newReport.id}`,
      JSON.stringify(newReport),
      86400,
    );

    this.emit('report-created', newReport);
    return newReport;
  }

  public async generateReport(reportId: string): Promise<any> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const reportData = {
      metadata: {
        id: report.id,
        name: report.name,
        generatedAt: new Date(),
        category: report.category,
      },
      widgets: [],
      summary: {},
    };

    for (const widgetId of report.widgets) {
      const widget = this.widgets.get(widgetId);
      if (widget) {
        const data = await this.cache.get(`analytics:${widget.dataSource}`);
        reportData.widgets.push({
          widget,
          data: data ? JSON.parse(data) : null,
        });
      }
    }

    this.emit('report-generated', { reportId, format: report.format });
    return reportData;
  }

  public getDashboardConfig(): any {
    return {
      widgets: Array.from(this.widgets.values()),
      charts: Array.from(this.charts.values()),
      reports: Array.from(this.reports.values()),
      metadata: {
        lastUpdated: new Date(),
        totalWidgets: this.widgets.size,
        totalCharts: this.charts.size,
        totalReports: this.reports.size,
      },
    };
  }

  public async exportDashboard(format: 'json' | 'pdf'): Promise<any> {
    const config = this.getDashboardConfig();

    if (format === 'json') {
      return config;
    } else if (format === 'pdf') {
      // Mock PDF generation - would integrate with PDF library
      return {
        filename: `dashboard-export-${Date.now()}.pdf`,
        size: '2.5MB',
        pages: 8,
        url: `/exports/dashboard-${Date.now()}.pdf`,
      };
    }
  }

  public destroy(): void {
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
    }
  }
}
