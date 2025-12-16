/**
 * useControlTowerData - Hook for fetching Control Tower dashboard data
 */

import { useState, useEffect, useCallback } from 'react';
import type { EventFilterState } from '../pages/control-tower/ControlTowerDashboard';
import type {
  HealthScoreComponent,
  KeyMetric,
  TeamMember,
  Situation,
  OperationalEvent,
} from '../components/control-tower';

export interface HealthScoreData {
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number;
  components: HealthScoreComponent[];
}

export interface ControlTowerData {
  healthScore: HealthScoreData | null;
  keyMetrics: KeyMetric[];
  teamPulse: TeamMember[];
  activeSituations: Situation[];
  events: OperationalEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Mock data for development
const mockHealthScore: HealthScoreData = {
  score: 87,
  trend: 'UP',
  change: 3,
  components: [
    { name: 'Support', score: 92, status: 'HEALTHY' },
    { name: 'Revenue', score: 85, status: 'WARNING' },
    { name: 'Product', score: 88, status: 'HEALTHY' },
    { name: 'Team', score: 83, status: 'WARNING' },
  ],
};

const mockKeyMetrics: KeyMetric[] = [
  {
    id: 'open_tickets',
    name: 'Open Tickets',
    value: 127,
    formattedValue: '127',
    trend: 'UP',
    change: 23,
    changePercent: 22.1,
    status: 'WARNING',
    sparkline: [100, 105, 98, 110, 115, 120, 127],
  },
  {
    id: 'support_csat',
    name: 'Support CSAT',
    value: 94.2,
    formattedValue: '94.2%',
    trend: 'DOWN',
    change: -1.2,
    changePercent: -1.3,
    status: 'HEALTHY',
    sparkline: [95.4, 95.1, 94.8, 94.5, 94.3, 94.2, 94.2],
  },
  {
    id: 'mrr_at_risk',
    name: 'MRR at Risk',
    value: 45200,
    formattedValue: '$45.2K',
    trend: 'STABLE',
    change: 0,
    status: 'WARNING',
  },
  {
    id: 'deploys_today',
    name: 'Deploys Today',
    value: 12,
    formattedValue: '12',
    trend: 'UP',
    change: 4,
    status: 'HEALTHY',
  },
  {
    id: 'active_users',
    name: 'Active Users',
    value: 8234,
    formattedValue: '8,234',
    trend: 'UP',
    change: 12,
    changePercent: 12,
    status: 'HEALTHY',
  },
  {
    id: 'nps',
    name: 'NPS',
    value: 67,
    formattedValue: '67',
    trend: 'UP',
    change: 4,
    status: 'HEALTHY',
  },
];

const mockTeamPulse: TeamMember[] = [
  {
    user: { id: '1', name: 'Sarah Chen', email: 'sarah@example.com' },
    status: { online: true, statusMessage: 'Working on Acme escalation', availableForAssignment: false },
    currentAssignment: 'Acme escalation',
    activeSituationsCount: 2,
    eventsAssignedToday: 5,
  },
  {
    user: { id: '2', name: 'Mike Johnson', email: 'mike@example.com' },
    status: { online: true, statusMessage: 'Working on Payment P1', availableForAssignment: false },
    currentAssignment: 'Payment P1',
    activeSituationsCount: 1,
    eventsAssignedToday: 3,
  },
  {
    user: { id: '3', name: 'Alex Rivera', email: 'alex@example.com' },
    status: { online: true, availableForAssignment: true },
    activeSituationsCount: 0,
    eventsAssignedToday: 2,
  },
  {
    user: { id: '4', name: 'Jordan Lee', email: 'jordan@example.com' },
    status: { online: true, statusMessage: 'In meeting until 2pm', availableForAssignment: false },
    currentAssignment: 'Q4 planning',
    activeSituationsCount: 1,
    eventsAssignedToday: 1,
  },
];

const mockActiveSituations: Situation[] = [
  {
    id: '1',
    title: 'Payment Processing',
    priority: 'P1',
    severity: 'CRITICAL',
    eventCount: 3,
    startedAt: new Date(Date.now() - 23 * 60 * 1000),
    owner: { id: '2', name: 'mike' },
  },
  {
    id: '2',
    title: 'Enterprise Onboarding Acme Corp delayed',
    priority: 'P2',
    severity: 'WARNING',
    eventCount: 5,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Support Volume Spike',
    priority: 'P2',
    severity: 'WARNING',
    eventCount: 12,
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: '4',
    title: 'Contract Renewal Risk - BigCo',
    priority: 'P3',
    severity: 'WARNING',
    eventCount: 2,
    startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const mockEvents: OperationalEvent[] = [
  {
    id: '1',
    title: 'Payment webhook failures detected',
    description: 'Stripe webhook endpoint returning 500 errors',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    category: 'PAYMENT',
    source: 'Stripe integration',
    occurredAt: new Date(Date.now() - 23 * 60 * 1000),
    assignedTo: { id: '2', name: 'mike' },
    correlatedEventsCount: 3,
  },
  {
    id: '2',
    title: 'Support queue exceeding SLA threshold',
    description: '23 tickets waiting > 4 hours',
    severity: 'WARNING',
    status: 'ACTIVE',
    category: 'SUPPORT',
    source: 'Zendesk',
    occurredAt: new Date(Date.now() - 35 * 60 * 1000),
    correlatedEventsCount: 1,
  },
  {
    id: '3',
    title: 'Deployment completed: v2.4.1',
    severity: 'SUCCESS',
    status: 'RESOLVED',
    category: 'PRODUCT',
    source: 'Production',
    occurredAt: new Date(Date.now() - 60 * 60 * 1000),
    assignedTo: { id: '3', name: 'alex' },
  },
  {
    id: '4',
    title: 'New enterprise lead: TechCorp ($200K potential)',
    severity: 'INFO',
    status: 'ACTIVE',
    category: 'SALES',
    source: 'Salesforce',
    occurredAt: new Date(Date.now() - 90 * 60 * 1000),
    assignedTo: { id: '4', name: 'jordan' },
    correlatedEventsCount: 2,
  },
  {
    id: '5',
    title: 'Customer health score dropped: Acme Corp',
    description: 'Score: 72→58, 3 risk factors identified',
    severity: 'WARNING',
    status: 'ACTIVE',
    category: 'CUSTOMER_HEALTH',
    source: 'ChurnZero',
    occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    correlatedEventsCount: 5,
  },
  {
    id: '6',
    title: 'Onboarding milestone: DataFlow Inc',
    description: 'Integration complete, 14 days ahead of schedule',
    severity: 'SUCCESS',
    status: 'RESOLVED',
    category: 'CUSTOMER_HEALTH',
    source: 'Onboarding System',
    occurredAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
];

export function useControlTowerData(filters: EventFilterState): ControlTowerData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{
    healthScore: HealthScoreData | null;
    keyMetrics: KeyMetric[];
    teamPulse: TeamMember[];
    activeSituations: Situation[];
    events: OperationalEvent[];
  }>({
    healthScore: null,
    keyMetrics: [],
    teamPulse: [],
    activeSituations: [],
    events: [],
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production, this would be GraphQL queries
      // const { data } = await client.query({ query: CONTROL_TOWER_QUERY, variables: { filters } });

      // Apply filters to mock data
      let filteredEvents = [...mockEvents];

      if (filters.severity?.length) {
        filteredEvents = filteredEvents.filter((e) =>
          filters.severity!.includes(e.severity)
        );
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredEvents = filteredEvents.filter(
          (e) =>
            e.title.toLowerCase().includes(query) ||
            e.description?.toLowerCase().includes(query)
        );
      }

      setData({
        healthScore: mockHealthScore,
        keyMetrics: mockKeyMetrics,
        teamPulse: mockTeamPulse,
        activeSituations: mockActiveSituations,
        events: filteredEvents,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useControlTowerData;
