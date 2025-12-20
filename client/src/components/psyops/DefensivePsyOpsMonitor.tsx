/**
 * Defensive Psychological Operations Monitor
 *
 * DEFENSIVE MONITORING ONLY: Real-time dashboard for detecting and responding to
 * psychological warfare attacks, influence campaigns, and cognitive manipulation attempts.
 *
 * This component provides visibility into:
 * - Incoming psychological threats and their severity
 * - Protective measures deployed to safeguard users
 * - Impact assessment and mitigation effectiveness
 * - Threat attribution and intelligence
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Brain,
  Eye,
} from 'lucide-react';

interface PsyOpsThreat {
  id: string;
  source: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attackVector: string;
  targetAudience: string;
  narrative: string;
  sentiment: number;
  credibilityScore: number;
  propagationRate: number;
  detectedAt: Date;
  status: 'MONITORING' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED';
}

interface DefensiveMetrics {
  activeThreats: number;
  threatsBlocked: number;
  usersProtected: number;
  averageResponseTime: number;
  effectivenessScore: number;
}

interface ProtectiveAction {
  id: string;
  type: 'COUNTER_NARRATIVE' | 'FACT_CHECK' | 'USER_ALERT' | 'CONTENT_FLAGGING';
  threatId: string;
  status: 'DEPLOYING' | 'ACTIVE' | 'COMPLETED';
  effectiveness: number;
  deployedAt: Date;
}

type AlertLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type DefensiveMeasure = ProtectiveAction['type'];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const DefensivePsyOpsMonitor: React.FC = () => {
  const [threats, setThreats] = useState<PsyOpsThreat[]>([]);
  const [metrics, setMetrics] = useState<DefensiveMetrics>({
    activeThreats: 0,
    threatsBlocked: 0,
    usersProtected: 0,
    averageResponseTime: 0,
    effectivenessScore: 0,
  });
  const [protectiveActions, setProtectiveActions] = useState<
    ProtectiveAction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('NORMAL');

  const fetchDefensiveData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch current threats
      const threatsData = await fetchJson<PsyOpsThreat[]>(
        '/api/defensive-psyops/threats',
      );
      setThreats(threatsData);

      // Fetch defensive metrics
      const metricsData = await fetchJson<DefensiveMetrics>(
        '/api/defensive-psyops/metrics',
      );
      setMetrics(metricsData);

      // Fetch protective actions
      const actionsData = await fetchJson<ProtectiveAction[]>(
        '/api/defensive-psyops/actions',
      );
      setProtectiveActions(actionsData);

      // Calculate alert level
      const criticalThreats = threatsData.filter(
        (t: PsyOpsThreat) => t.threatLevel === 'CRITICAL',
      ).length;
      const highThreats = threatsData.filter(
        (t: PsyOpsThreat) => t.threatLevel === 'HIGH',
      ).length;

      if (criticalThreats > 0) {
        setAlertLevel('CRITICAL');
      } else if (highThreats > 2) {
        setAlertLevel('HIGH');
      } else if (threatsData.length > 5) {
        setAlertLevel('ELEVATED');
      } else {
        setAlertLevel('NORMAL');
      }
    } catch (error) {
      console.error('Error fetching defensive data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deployDefensiveMeasure = async (
    threatId: string,
    measureType: DefensiveMeasure,
  ) => {
    try {
      await fetch('/api/defensive-psyops/deploy-measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threatId, measureType }),
      });

      // Refresh data
      fetchDefensiveData();
    } catch (error) {
      console.error('Error deploying defensive measure:', error);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-50';
      case 'HIGH':
        return 'border-orange-500 bg-orange-50';
      case 'ELEVATED':
        return 'border-yellow-500 bg-yellow-50';
      case 'NORMAL':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  useEffect(() => {
    fetchDefensiveData();

    // Set up real-time updates
    const interval = setInterval(fetchDefensiveData, 30000);
    return () => clearInterval(interval);
  }, [fetchDefensiveData]);

  return (
    <div className="space-y-6 p-6">
      {/* Alert Status Banner */}
      <Alert className={getAlertLevelColor(alertLevel)}>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Defense Status: {alertLevel}</strong>
          {alertLevel === 'CRITICAL' &&
            ' - Critical psychological threats detected. All defensive measures activated.'}
          {alertLevel === 'HIGH' &&
            ' - Elevated threat level. Enhanced monitoring in effect.'}
          {alertLevel === 'ELEVATED' &&
            ' - Increased psychological activity detected.'}
          {alertLevel === 'NORMAL' &&
            ' - Normal operations. Continuous monitoring active.'}
        </AlertDescription>
      </Alert>

      {/* Defensive Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold">{metrics.activeThreats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Threats Blocked</p>
                <p className="text-2xl font-bold">{metrics.threatsBlocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Users Protected</p>
                <p className="text-2xl font-bold">
                  {metrics.usersProtected.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {metrics.averageResponseTime}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm text-gray-600">Effectiveness</p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.effectivenessScore * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Threats Monitoring */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Active Psychological Threats
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {threats.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">
                  No active psychological threats detected
                </p>
              </div>
            ) : (
              threats.map((threat) => (
                <div
                  key={threat.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          className={getThreatLevelColor(threat.threatLevel)}
                        >
                          {threat.threatLevel}
                        </Badge>
                        <Badge variant="outline">{threat.status}</Badge>
                        <span className="text-sm text-gray-500">
                          Source: {threat.source}
                        </span>
                      </div>

                      <h4 className="font-medium">
                        Attack Vector: {threat.attackVector}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Target: {threat.targetAudience}
                      </p>

                      <div className="mt-2 text-sm">
                        <p className="bg-gray-100 p-2 rounded">
                          Narrative: {threat.narrative}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-600">Sentiment:</span>
                          <Progress
                            value={threat.sentiment * 100}
                            className="h-2 mt-1"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600">Credibility:</span>
                          <Progress
                            value={threat.credibilityScore * 100}
                            className="h-2 mt-1"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600">Propagation:</span>
                          <Progress
                            value={threat.propagationRate * 100}
                            className="h-2 mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 space-y-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          deployDefensiveMeasure(threat.id, 'COUNTER_NARRATIVE')
                        }
                        disabled={threat.status === 'RESOLVED'}
                      >
                        Deploy Counter-Narrative
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          deployDefensiveMeasure(threat.id, 'FACT_CHECK')
                        }
                        disabled={threat.status === 'RESOLVED'}
                      >
                        Deploy Fact Check
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Detected: {new Date(threat.detectedAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Defensive Actions Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Active Defensive Measures
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {protectiveActions.length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No defensive measures currently deployed
              </p>
            ) : (
              protectiveActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center space-x-3">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {action.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Threat ID: {action.threatId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm">
                        Effectiveness: {Math.round(action.effectiveness * 100)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.status === 'ACTIVE' ? (
                          <CheckCircle className="h-3 w-3 inline text-green-500 mr-1" />
                        ) : action.status === 'DEPLOYING' ? (
                          <Clock className="h-3 w-3 inline text-yellow-500 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 inline text-gray-500 mr-1" />
                        )}
                        {action.status}
                      </p>
                    </div>
                    <Badge
                      variant={
                        action.status === 'ACTIVE' ? 'default' : 'secondary'
                      }
                    >
                      {action.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Refresh Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
        <Button onClick={fetchDefensiveData} disabled={loading} size="sm">
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  );
};
