import React, { useState, useMemo } from 'react';
import type {
  Adversary,
  Detection,
  DefenseStrategy,
  TacticEvent,
  SimulationScenario,
  RiskScore,
  Alert,
  Campaign,
} from './types';

export interface AdversarialDashboardProps {
  adversaries: Adversary[];
  detections: Detection[];
  defenseStrategies: DefenseStrategy[];
  tacticEvents: TacticEvent[];
  simulations: SimulationScenario[];
  riskScore?: RiskScore;
  alerts: Alert[];
  campaigns: Campaign[];
  onSelectAdversary?: (adversary: Adversary) => void;
  onSelectDetection?: (detection: Detection) => void;
  onRunSimulation?: (scenario: SimulationScenario) => void;
  className?: string;
}

export const AdversarialDashboard: React.FC<AdversarialDashboardProps> = ({
  adversaries,
  detections,
  defenseStrategies,
  tacticEvents,
  simulations,
  riskScore,
  alerts,
  campaigns,
  onSelectAdversary,
  onSelectDetection,
  onRunSimulation,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'defense' | 'simulations'>(
    'overview'
  );

  const stats = useMemo(() => {
    const activeAdversaries = adversaries.filter((a) => a.active).length;
    const criticalDetections = detections.filter((d) => d.severity === 'critical').length;
    const highDetections = detections.filter((d) => d.severity === 'high').length;
    const unresolvedDetections = detections.filter(
      (d) => d.status !== 'resolved' && d.status !== 'false-positive'
    ).length;
    const activeStrategies = defenseStrategies.filter((s) => s.status === 'active').length;
    const avgCoverage =
      defenseStrategies.length > 0
        ? Math.round(
            defenseStrategies.reduce((sum, s) => sum + s.coverage, 0) / defenseStrategies.length
          )
        : 0;
    const runningSimulations = simulations.filter((s) => s.status === 'running').length;
    const newAlerts = alerts.filter((a) => a.status === 'new').length;
    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

    const detectionTrend = tacticEvents.filter((e) => {
      const eventDate = new Date(e.timestamp);
      const now = new Date();
      return now.getTime() - eventDate.getTime() < 24 * 60 * 60 * 1000;
    }).length;

    return {
      activeAdversaries,
      criticalDetections,
      highDetections,
      unresolvedDetections,
      totalDetections: detections.length,
      activeStrategies,
      totalStrategies: defenseStrategies.length,
      avgCoverage,
      runningSimulations,
      totalSimulations: simulations.length,
      newAlerts,
      totalAlerts: alerts.length,
      activeCampaigns,
      detectionTrend,
    };
  }, [adversaries, detections, defenseStrategies, tacticEvents, simulations, alerts, campaigns]);

  const recentDetections = useMemo(() => {
    return [...detections]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [detections]);

  const topAdversaries = useMemo(() => {
    return [...adversaries]
      .filter((a) => a.active)
      .sort((a, b) => {
        const levelOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return levelOrder[b.threatLevel] - levelOrder[a.threatLevel];
      })
      .slice(0, 5);
  }, [adversaries]);

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`} data-testid="adversarial-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Adversarial Defense Platform</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time threat monitoring and defense coordination
            </p>
          </div>
          <div className="flex items-center gap-4">
            {riskScore && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Risk Score</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">{riskScore.overall}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${getRiskLevelColor(
                      riskScore.level
                    )}`}
                  >
                    {riskScore.level.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {(['overview', 'threats', 'defense', 'simulations'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Active Adversaries</div>
                <div className="text-2xl font-bold text-purple-600">{stats.activeAdversaries}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Critical Detections</div>
                <div className="text-2xl font-bold text-red-600">{stats.criticalDetections}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Unresolved</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.unresolvedDetections}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Avg Coverage</div>
                <div className="text-2xl font-bold text-green-600">{stats.avgCoverage}%</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">New Alerts</div>
                <div className="text-2xl font-bold text-blue-600">{stats.newAlerts}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Active Campaigns</div>
                <div className="text-2xl font-bold text-indigo-600">{stats.activeCampaigns}</div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Detections */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Detections</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentDetections.map((detection) => (
                    <div
                      key={detection.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelectDetection?.(detection)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{detection.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{detection.technique}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              detection.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : detection.severity === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {detection.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(detection.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentDetections.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No recent detections</div>
                  )}
                </div>
              </div>

              {/* Top Adversaries */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Top Active Adversaries</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {topAdversaries.map((adversary) => (
                    <div
                      key={adversary.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelectAdversary?.(adversary)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                            {adversary.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{adversary.name}</h3>
                            <p className="text-sm text-gray-500">{adversary.type}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getRiskLevelColor(
                            adversary.threatLevel
                          )}`}
                        >
                          {adversary.threatLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>{adversary.techniques.length} techniques</span>
                        <span>{adversary.campaigns.length} campaigns</span>
                        <span>{adversary.confidence}% confidence</span>
                      </div>
                    </div>
                  ))}
                  {topAdversaries.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No active adversaries</div>
                  )}
                </div>
              </div>
            </div>

            {/* Defense Status */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Defense Status</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Active Strategies</div>
                    <div className="text-xl font-bold text-gray-900">
                      {stats.activeStrategies} / {stats.totalStrategies}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${
                            stats.totalStrategies > 0
                              ? (stats.activeStrategies / stats.totalStrategies) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Running Simulations</div>
                    <div className="text-xl font-bold text-gray-900">{stats.runningSimulations}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Detection Trend (24h)</div>
                    <div className="text-xl font-bold text-gray-900">{stats.detectionTrend}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Alert Queue</div>
                    <div className="text-xl font-bold text-gray-900">
                      {stats.newAlerts} / {stats.totalAlerts}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'threats' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>Threats view - Integrate ThreatDetectionPanel and MitreAttackMatrix components here</p>
          </div>
        )}

        {activeTab === 'defense' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>Defense view - Integrate DefenseStrategyCard and coverage metrics here</p>
          </div>
        )}

        {activeTab === 'simulations' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Attack Simulations</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {simulations.map((sim) => (
                <div key={sim.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{sim.name}</h3>
                      <p className="text-sm text-gray-500">{sim.techniques.length} techniques</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          sim.status === 'running'
                            ? 'bg-blue-100 text-blue-800'
                            : sim.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sim.status.toUpperCase()}
                      </span>
                      {sim.status === 'pending' && (
                        <button
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => onRunSimulation?.(sim)}
                        >
                          Run
                        </button>
                      )}
                    </div>
                  </div>
                  {sim.results && (
                    <div className="mt-2 flex gap-4 text-sm">
                      <span className="text-green-600">
                        Detected: {sim.results.detected}
                      </span>
                      <span className="text-blue-600">
                        Blocked: {sim.results.blocked}
                      </span>
                      <span className="text-red-600">Evaded: {sim.results.evaded}</span>
                    </div>
                  )}
                </div>
              ))}
              {simulations.length === 0 && (
                <div className="p-8 text-center text-gray-500">No simulations configured</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdversarialDashboard;
