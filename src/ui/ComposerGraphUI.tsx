#!/usr/bin/env node

/**
 * Composer Graph UI - Web Dashboard
 * Critical path, cache hits/misses, cross-repo impact, policy violations, flaky quarantine heatmap
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FederatedGraphService } from '../federation/FederatedGraphService.js';
import { CostCarbonTelemetry } from '../telemetry/CostCarbonTelemetry.js';
import { CoverageMapV25 } from '../coverage/CoverageMapV25.js';

// Dashboard Layout Component
export const ComposerGraphUI: React.FC<{
  federatedGraph: FederatedGraphService;
  telemetry: CostCarbonTelemetry;
  coverageMap: CoverageMapV25;
}> = ({ federatedGraph, telemetry, coverageMap }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'graph' | 'costs' | 'quality'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [graphStats, telemetryStats, coverageStats] = await Promise.all([
        federatedGraph.getGlobalStats(),
        telemetry.getCurrentMetrics(),
        coverageMap.getStats(),
      ]);

      setDashboardData({
        graph: graphStats,
        telemetry: telemetryStats,
        coverage: coverageStats,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [federatedGraph, telemetry, coverageMap]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="composer-dashboard">
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={dashboardData?.lastUpdated}
      />

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab data={dashboardData} onRefresh={loadDashboardData} />
        )}

        {activeTab === 'graph' && (
          <GraphTab
            federatedGraph={federatedGraph}
            graphStats={dashboardData?.graph}
          />
        )}

        {activeTab === 'costs' && (
          <CostsTab
            telemetry={telemetry}
            telemetryStats={dashboardData?.telemetry}
          />
        )}

        {activeTab === 'quality' && (
          <QualityTab
            coverageMap={coverageMap}
            coverageStats={dashboardData?.coverage}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab - High-level metrics and alerts
const OverviewTab: React.FC<{
  data: any;
  onRefresh: () => void;
}> = ({ data, onRefresh }) => {
  const [criticalPath, setCriticalPath] = useState<any[]>([]);

  useEffect(() => {
    // Simulate critical path calculation
    setCriticalPath([
      { step: 'Dependency Resolution', duration: 45000, parallel: false },
      { step: 'TypeScript Compilation', duration: 120000, parallel: true },
      { step: 'Test Execution', duration: 89000, parallel: true },
      { step: 'Container Build', duration: 156000, parallel: false },
      { step: 'Deployment', duration: 67000, parallel: false },
    ]);
  }, []);

  return (
    <div className="overview-tab">
      <div className="metrics-grid">
        <MetricCard
          title="Build Success Rate"
          value={`${(data?.telemetry?.efficiency?.successRate * 100 || 0).toFixed(1)}%`}
          trend={+2.3}
          color="green"
        />

        <MetricCard
          title="Cache Hit Rate"
          value={`${(data?.telemetry?.efficiency?.cacheHitRate * 100 || 0).toFixed(1)}%`}
          trend={+5.7}
          color="blue"
        />

        <MetricCard
          title="Daily Cost"
          value={`$${data?.telemetry?.today?.costUsd?.toFixed(2) || '0.00'}`}
          trend={-12.4}
          color="orange"
        />

        <MetricCard
          title="Carbon Footprint"
          value={`${data?.telemetry?.today?.carbonKg?.toFixed(2) || '0.00'}kg`}
          trend={-8.1}
          color="purple"
        />
      </div>

      <div className="dashboard-sections">
        <CriticalPathView
          path={criticalPath}
          totalDuration={criticalPath.reduce(
            (sum, step) => sum + step.duration,
            0,
          )}
        />

        <RecentActivityFeed activities={getRecentActivities()} />

        <AlertsPanel alerts={getActiveAlerts()} />
      </div>

      <div className="quick-actions">
        <QuickActionButton icon="🔄" label="Refresh Data" onClick={onRefresh} />
        <QuickActionButton
          icon="📊"
          label="Generate Report"
          onClick={() => console.log('Generate report')}
        />
        <QuickActionButton
          icon="⚡"
          label="Optimize Builds"
          onClick={() => console.log('Optimize builds')}
        />
      </div>
    </div>
  );
};

// Graph Tab - Federation and dependency visualization
const GraphTab: React.FC<{
  federatedGraph: FederatedGraphService;
  graphStats: any;
}> = ({ federatedGraph, graphStats }) => {
  const [queryResult, setQueryResult] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;

    try {
      const result = await federatedGraph.query(query);
      setQueryResult(result);
    } catch (error) {
      console.error('Query failed:', error);
      setQueryResult({ error: error.message });
    }
  }, [federatedGraph, query]);

  return (
    <div className="graph-tab">
      <div className="graph-header">
        <div className="repo-selector">
          <label>Repository:</label>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
          >
            <option value="all">All Repositories</option>
            {federatedGraph.listRepositories().map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>

        <div className="graph-stats">
          <StatBadge label="Total Nodes" value={graphStats?.totalNodes || 0} />
          <StatBadge
            label="Cross-Repo Edges"
            value={graphStats?.crossRepoEdges || 0}
          />
          <StatBadge
            label="Active Repos"
            value={graphStats?.activeRepos || 0}
          />
        </div>
      </div>

      <div className="query-section">
        <div className="query-input">
          <input
            type="text"
            placeholder="Query: deps //repo:path, find *.ts, impact //repo:file"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeQuery()}
          />
          <button onClick={executeQuery}>Query</button>
        </div>

        {queryResult && <QueryResults result={queryResult} />}
      </div>

      <div className="graph-visualization">
        <DependencyGraphVisualization
          nodes={queryResult?.nodes || []}
          edges={queryResult?.edges || []}
          selectedRepo={selectedRepo}
        />
      </div>

      <div className="cross-repo-impact">
        <CrossRepoImpactHeatmap
          federatedGraph={federatedGraph}
          selectedRepo={selectedRepo}
        />
      </div>
    </div>
  );
};

// Costs Tab - Financial and environmental metrics
const CostsTab: React.FC<{
  telemetry: CostCarbonTelemetry;
  telemetryStats: any;
}> = ({ telemetry, telemetryStats }) => {
  const [costReport, setCostReport] = useState<any>(null);
  const [reportPeriod, setReportPeriod] = useState<
    'daily' | 'weekly' | 'monthly'
  >('weekly');

  useEffect(() => {
    const generateCostReport = async () => {
      const now = Date.now();
      const periodMs = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
      }[reportPeriod];

      try {
        const report = await telemetry.generateCostReport(now - periodMs, now);
        setCostReport(report);
      } catch (error) {
        console.error('Failed to generate cost report:', error);
      }
    };

    generateCostReport();
  }, [telemetry, reportPeriod]);

  return (
    <div className="costs-tab">
      <div className="period-selector">
        <button
          className={reportPeriod === 'daily' ? 'active' : ''}
          onClick={() => setReportPeriod('daily')}
        >
          Daily
        </button>
        <button
          className={reportPeriod === 'weekly' ? 'active' : ''}
          onClick={() => setReportPeriod('weekly')}
        >
          Weekly
        </button>
        <button
          className={reportPeriod === 'monthly' ? 'active' : ''}
          onClick={() => setReportPeriod('monthly')}
        >
          Monthly
        </button>
      </div>

      <div className="cost-overview">
        <CostBreakdownChart
          data={costReport?.totalCost || {}}
          period={reportPeriod}
        />

        <CarbonFootprintChart
          data={costReport?.totalCarbon || {}}
          period={reportPeriod}
        />
      </div>

      <div className="cost-breakdowns">
        <CostBreakdownTable
          title="By Target"
          data={costReport?.breakdown?.byTarget || []}
        />

        <CostBreakdownTable
          title="By User"
          data={costReport?.breakdown?.byUser || []}
        />

        <CostBreakdownTable
          title="By Region"
          data={costReport?.breakdown?.byRegion || []}
        />
      </div>

      <div className="cost-recommendations">
        <h3>💡 Cost Optimization Recommendations</h3>
        {costReport?.recommendations?.map((rec: any, idx: number) => (
          <RecommendationCard key={idx} recommendation={rec} />
        ))}
      </div>
    </div>
  );
};

// Quality Tab - Coverage, flaky tests, policy violations
const QualityTab: React.FC<{
  coverageMap: CoverageMapV25;
  coverageStats: any;
}> = ({ coverageMap, coverageStats }) => {
  const [highRiskFiles, setHighRiskFiles] = useState<any[]>([]);
  const [coverageTrends, setCoverageTrends] = useState<any>(null);

  useEffect(() => {
    const loadQualityData = async () => {
      const riskFiles = coverageMap.getHighRiskFiles(10);
      const trends = coverageMap.getCoverageTrends();

      setHighRiskFiles(riskFiles);
      setCoverageTrends(trends);
    };

    loadQualityData();
  }, [coverageMap]);

  return (
    <div className="quality-tab">
      <div className="quality-overview">
        <QualityMetric
          title="Test Coverage"
          value={`${coverageStats?.latestCoverage?.toFixed(1) || 0}%`}
          target={85}
          color="green"
        />

        <QualityMetric
          title="Risk Score"
          value={coverageStats?.avgRiskScore?.toFixed(2) || '0.00'}
          target={0.3}
          color="red"
          invert
        />

        <QualityMetric
          title="High Risk Files"
          value={coverageStats?.highRiskFiles || 0}
          target={5}
          color="orange"
          invert
        />
      </div>

      <div className="quality-sections">
        <CoverageTrendChart trends={coverageTrends} title="Coverage Trends" />

        <HighRiskFilesTable
          files={highRiskFiles}
          onFileSelect={(file) => console.log('Selected file:', file)}
        />

        <FlakyTestHeatmap
          // Would get flaky test data from quarantine system
          tests={getMockFlakyTests()}
        />
      </div>

      <div className="policy-violations">
        <PolicyViolationsPanel violations={getMockPolicyViolations()} />
      </div>
    </div>
  );
};

// Supporting Components

const LoadingSpinner: React.FC = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading Composer Graph Dashboard...</p>
  </div>
);

const DashboardHeader: React.FC<{
  activeTab: string;
  onTabChange: (tab: any) => void;
  lastUpdated?: number;
}> = ({ activeTab, onTabChange, lastUpdated }) => (
  <header className="dashboard-header">
    <div className="header-title">
      <h1>🎯 Composer Graph UI</h1>
      <span className="subtitle">Federation & Foresight Dashboard</span>
    </div>

    <nav className="tab-navigation">
      {[
        { id: 'overview', label: '📊 Overview', icon: '📊' },
        { id: 'graph', label: '🌐 Graph', icon: '🌐' },
        { id: 'costs', label: '💰 Costs', icon: '💰' },
        { id: 'quality', label: '🎯 Quality', icon: '🎯' },
      ].map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </nav>

    {lastUpdated && (
      <div className="last-updated">
        Last updated: {new Date(lastUpdated).toLocaleTimeString()}
      </div>
    )}
  </header>
);

const MetricCard: React.FC<{
  title: string;
  value: string;
  trend?: number;
  color: 'green' | 'blue' | 'orange' | 'purple';
}> = ({ title, value, trend, color }) => (
  <div className={`metric-card ${color}`}>
    <div className="metric-header">
      <h3>{title}</h3>
      {trend !== undefined && (
        <span className={`trend ${trend > 0 ? 'positive' : 'negative'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
    <div className="metric-value">{value}</div>
  </div>
);

const CriticalPathView: React.FC<{
  path: Array<{ step: string; duration: number; parallel: boolean }>;
  totalDuration: number;
}> = ({ path, totalDuration }) => (
  <div className="critical-path-view">
    <h3>🛤️ Critical Path Analysis</h3>
    <div className="path-timeline">
      {path.map((step, idx) => (
        <div
          key={idx}
          className={`path-step ${step.parallel ? 'parallel' : 'sequential'}`}
          style={{ width: `${(step.duration / totalDuration) * 100}%` }}
        >
          <div className="step-name">{step.step}</div>
          <div className="step-duration">
            {(step.duration / 1000).toFixed(1)}s
          </div>
        </div>
      ))}
    </div>
    <div className="total-duration">
      Total: {(totalDuration / 1000).toFixed(1)}s
    </div>
  </div>
);

const QueryResults: React.FC<{ result: any }> = ({ result }) => {
  if (result.error) {
    return <div className="query-error">❌ Query failed: {result.error}</div>;
  }

  return (
    <div className="query-results">
      <div className="result-header">
        <span>✅ {result.nodes?.length || 0} nodes</span>
        <span>🔗 {result.edges?.length || 0} edges</span>
        <span>⏱️ {result.duration?.toFixed(1) || 0}ms</span>
        {result.cached && <span>📦 cached</span>}
      </div>

      {result.crossRepoImpact && (
        <div className="cross-repo-summary">
          Affects {result.crossRepoImpact.affectedRepos.length} repositories
        </div>
      )}

      <div className="result-nodes">
        {result.nodes?.slice(0, 10).map((node: any, idx: number) => (
          <div key={idx} className="result-node">
            <span className="node-repo">{node.repoId}</span>
            <span className="node-path">{node.path}</span>
            <span className="node-type">{node.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DependencyGraphVisualization: React.FC<{
  nodes: any[];
  edges: any[];
  selectedRepo: string;
}> = ({ nodes, edges, selectedRepo }) => (
  <div className="graph-visualization">
    <div className="graph-canvas">
      {/* Simplified graph visualization */}
      <svg width="100%" height="400">
        {nodes.map((node, idx) => (
          <g key={idx}>
            <circle
              cx={50 + idx * 80}
              cy={200}
              r={20}
              fill={node.repoId === selectedRepo ? '#007acc' : '#ccc'}
            />
            <text x={50 + idx * 80} y={205} textAnchor="middle" fontSize="10">
              {node.id.slice(0, 8)}
            </text>
          </g>
        ))}

        {edges.map((edge, idx) => (
          <line
            key={idx}
            x1={50}
            y1={200}
            x2={130}
            y2={200}
            stroke="#666"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        ))}

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
      </svg>
    </div>
  </div>
);

// Mock data functions (would be replaced with real data)
const getRecentActivities = () => [
  {
    time: '2 min ago',
    event: 'Build completed',
    target: 'api-service',
    status: 'success',
  },
  {
    time: '5 min ago',
    event: 'Speculative task started',
    target: 'ui-components',
    status: 'running',
  },
  {
    time: '8 min ago',
    event: 'Cache miss',
    target: 'database-migrations',
    status: 'warning',
  },
  {
    time: '12 min ago',
    event: 'Policy violation',
    target: 'auth-service',
    status: 'error',
  },
];

const getActiveAlerts = () => [
  {
    level: 'warning',
    message: 'Daily cost approaching budget limit ($87.50 of $100.00)',
  },
  {
    level: 'info',
    message: 'Cache hit rate improved to 78.3% (+5.2% from yesterday)',
  },
  { level: 'error', message: '3 flaky tests detected and quarantined' },
];

const getMockFlakyTests = () => [
  { test: 'auth.test.ts:42', flakeRate: 0.31, lastRun: Date.now() - 3600000 },
  { test: 'api.test.ts:156', flakeRate: 0.28, lastRun: Date.now() - 7200000 },
  { test: 'ui.test.ts:89', flakeRate: 0.25, lastRun: Date.now() - 1800000 },
];

const getMockPolicyViolations = () => [
  {
    file: 'Dockerfile',
    rule: 'missing-health-check',
    severity: 'warning',
    autoFixed: true,
  },
  {
    file: 'package.json',
    rule: 'unpinned-dependency',
    severity: 'info',
    autoFixed: true,
  },
  {
    file: 'src/auth.ts',
    rule: 'hardcoded-secret',
    severity: 'error',
    autoFixed: false,
  },
];

// Additional UI Components would be implemented here...
const RecentActivityFeed: React.FC<{ activities: any[] }> = ({
  activities,
}) => (
  <div className="activity-feed">
    <h3>📈 Recent Activity</h3>
    {activities.map((activity, idx) => (
      <div key={idx} className={`activity-item ${activity.status}`}>
        <span className="activity-time">{activity.time}</span>
        <span className="activity-event">{activity.event}</span>
        <span className="activity-target">{activity.target}</span>
      </div>
    ))}
  </div>
);

const AlertsPanel: React.FC<{ alerts: any[] }> = ({ alerts }) => (
  <div className="alerts-panel">
    <h3>🚨 Alerts</h3>
    {alerts.map((alert, idx) => (
      <div key={idx} className={`alert ${alert.level}`}>
        {alert.message}
      </div>
    ))}
  </div>
);

const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button className="quick-action-button" onClick={onClick}>
    <span className="icon">{icon}</span>
    <span className="label">{label}</span>
  </button>
);

// More components would be implemented for complete functionality...
const StatBadge: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="stat-badge">
    <span className="stat-value">{value.toLocaleString()}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const CrossRepoImpactHeatmap: React.FC<{
  federatedGraph: FederatedGraphService;
  selectedRepo: string;
}> = ({ federatedGraph, selectedRepo }) => (
  <div className="cross-repo-heatmap">
    <h3>🌊 Cross-Repository Impact Heatmap</h3>
    <div className="heatmap-placeholder">
      {/* Would show visual heatmap of cross-repo dependencies */}
      <p>
        Interactive heatmap showing dependency relationships between
        repositories
      </p>
    </div>
  </div>
);

const CostBreakdownChart: React.FC<{
  data: any;
  period: string;
}> = ({ data, period }) => (
  <div className="cost-breakdown-chart">
    <h3>💰 Cost Breakdown ({period})</h3>
    <div className="chart-placeholder">
      <div className="cost-item">
        <span>CPU: ${data.cpuCostUsd?.toFixed(2) || '0.00'}</span>
        <div className="cost-bar" style={{ width: '60%' }}></div>
      </div>
      <div className="cost-item">
        <span>Memory: ${data.memoryCostUsd?.toFixed(2) || '0.00'}</span>
        <div className="cost-bar" style={{ width: '25%' }}></div>
      </div>
      <div className="cost-item">
        <span>Network: ${data.networkCostUsd?.toFixed(2) || '0.00'}</span>
        <div className="cost-bar" style={{ width: '10%' }}></div>
      </div>
      <div className="cost-item">
        <span>Storage: ${data.storageCostUsd?.toFixed(2) || '0.00'}</span>
        <div className="cost-bar" style={{ width: '5%' }}></div>
      </div>
    </div>
  </div>
);

const CarbonFootprintChart: React.FC<{
  data: any;
  period: string;
}> = ({ data, period }) => (
  <div className="carbon-chart">
    <h3>🌱 Carbon Footprint ({period})</h3>
    <div className="carbon-display">
      <div className="carbon-amount">
        {data.totalCarbonKg?.toFixed(2) || '0.00'} kg CO₂
      </div>
      <div className="carbon-equivalent">≈ {data.equivalent || 'N/A'}</div>
    </div>
  </div>
);

const CostBreakdownTable: React.FC<{
  title: string;
  data: any[];
}> = ({ title, data }) => (
  <div className="cost-breakdown-table">
    <h4>{title}</h4>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Cost</th>
          <th>Carbon</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 5).map((item, idx) => (
          <tr key={idx}>
            <td>{Object.values(item)[0] as string}</td>
            <td>${item.costUsd?.toFixed(2)}</td>
            <td>{item.carbonKg?.toFixed(3)}kg</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RecommendationCard: React.FC<{
  recommendation: any;
}> = ({ recommendation }) => (
  <div className="recommendation-card">
    <div className="recommendation-type">{recommendation.type}</div>
    <div className="recommendation-description">
      {recommendation.description}
    </div>
    {recommendation.potentialSavings && (
      <div className="potential-savings">
        Potential savings:
        {recommendation.potentialSavings.costUsd &&
          ` $${recommendation.potentialSavings.costUsd.toFixed(2)}`}
        {recommendation.potentialSavings.carbonKg &&
          ` ${recommendation.potentialSavings.carbonKg.toFixed(2)}kg CO₂`}
      </div>
    )}
  </div>
);

const QualityMetric: React.FC<{
  title: string;
  value: string;
  target: number;
  color: string;
  invert?: boolean;
}> = ({ title, value, target, color, invert = false }) => {
  const numericValue = parseFloat(value);
  const isGood = invert ? numericValue < target : numericValue >= target;

  return (
    <div className={`quality-metric ${color} ${isGood ? 'good' : 'bad'}`}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-target">
        Target: {invert ? '<' : '≥'} {target}
      </div>
    </div>
  );
};

const CoverageTrendChart: React.FC<{
  trends: any;
  title: string;
}> = ({ trends, title }) => (
  <div className="coverage-trend-chart">
    <h3>{title}</h3>
    <div className="trend-info">
      Direction:{' '}
      <span className={trends?.trendDirection}>{trends?.trendDirection}</span>
      <br />
      Change Rate: {trends?.avgChangeRate?.toFixed(2)}%/day
    </div>
  </div>
);

const HighRiskFilesTable: React.FC<{
  files: any[];
  onFileSelect: (file: string) => void;
}> = ({ files, onFileSelect }) => (
  <div className="high-risk-files">
    <h3>⚠️ High Risk Files</h3>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Risk Score</th>
          <th>Coverage</th>
          <th>Reasoning</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file, idx) => (
          <tr key={idx} onClick={() => onFileSelect(file.filePath)}>
            <td>{file.filePath}</td>
            <td>{file.riskScore.toFixed(2)}</td>
            <td>{file.coveragePercentage.toFixed(1)}%</td>
            <td>{file.reasoning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const FlakyTestHeatmap: React.FC<{
  tests: any[];
}> = ({ tests }) => (
  <div className="flaky-test-heatmap">
    <h3>🔥 Flaky Test Heatmap</h3>
    <div className="heatmap-grid">
      {tests.map((test, idx) => (
        <div
          key={idx}
          className="heatmap-cell"
          style={{
            backgroundColor: `rgba(255, 0, 0, ${test.flakeRate})`,
            color: test.flakeRate > 0.5 ? 'white' : 'black',
          }}
          title={`${test.test}: ${(test.flakeRate * 100).toFixed(1)}% flake rate`}
        >
          {test.test.split(':')[0]}
        </div>
      ))}
    </div>
  </div>
);

const PolicyViolationsPanel: React.FC<{
  violations: any[];
}> = ({ violations }) => (
  <div className="policy-violations">
    <h3>🛡️ Policy Violations</h3>
    {violations.map((violation, idx) => (
      <div key={idx} className={`violation ${violation.severity}`}>
        <span className="violation-file">{violation.file}</span>
        <span className="violation-rule">{violation.rule}</span>
        <span className="violation-status">
          {violation.autoFixed ? '✅ Auto-fixed' : '❌ Needs attention'}
        </span>
      </div>
    ))}
  </div>
);

export default ComposerGraphUI;
