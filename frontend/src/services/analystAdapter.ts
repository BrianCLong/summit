/**
 * Analyst Adapter — thin service boundary over case/entity/timeline data.
 *
 * The interface is deliberately narrow so real API calls can replace the mock
 * implementations without touching UI components.
 */

import type { CaseData } from '../store/workspaceSlice';

export interface AnalystAdapter {
  getCase(caseId: string): Promise<CaseData>;
  searchCases(query: string): Promise<Array<{ id: string; title: string }>>;
}

// ---------------------------------------------------------------------------
// Mock seed data
// ---------------------------------------------------------------------------
const MOCK_CASE: CaseData = {
  id: 'case-001',
  title: 'Operation Sandstorm',
  description:
    'Cross-border financial disinformation network linked to coordinated social media manipulation.',
  entities: [
    {
      id: 'e-001',
      label: 'Viktor Morozov',
      type: 'person',
      deception_score: 0.87,
      connections: ['e-002', 'e-004', 'e-005'],
      properties: {
        nationality: 'RU',
        role: 'Network coordinator',
        risk: 'HIGH',
      },
    },
    {
      id: 'e-002',
      label: 'Nexus Holdings LLC',
      type: 'organization',
      deception_score: 0.72,
      connections: ['e-001', 'e-003', 'e-006'],
      properties: { jurisdiction: 'CY', type: 'Shell company', risk: 'HIGH' },
    },
    {
      id: 'e-003',
      label: 'Dubai Free Zone Office',
      type: 'location',
      deception_score: 0.31,
      connections: ['e-002', 'e-007'],
      properties: { country: 'AE', city: 'Dubai', risk: 'MEDIUM' },
    },
    {
      id: 'e-004',
      label: '@sandstorm_truth',
      type: 'account',
      deception_score: 0.94,
      connections: ['e-001', 'e-008'],
      properties: {
        platform: 'Twitter/X',
        followers: 42000,
        created: '2023-01-15',
        risk: 'CRITICAL',
      },
    },
    {
      id: 'e-005',
      label: 'Propaganda Leaflet #7',
      type: 'document',
      deception_score: 0.91,
      connections: ['e-001', 'e-004'],
      properties: {
        language: 'EN/AR',
        pages: 4,
        classification: 'RESTRICTED',
        risk: 'HIGH',
      },
    },
    {
      id: 'e-006',
      label: 'Q4 Wire Transfer',
      type: 'event',
      deception_score: 0.68,
      connections: ['e-002', 'e-003'],
      properties: {
        amount: '$240,000',
        currency: 'USD',
        date: '2023-11-02',
        risk: 'HIGH',
      },
    },
    {
      id: 'e-007',
      label: 'Al Rashid Consultants',
      type: 'organization',
      deception_score: 0.44,
      connections: ['e-003', 'e-006'],
      properties: { jurisdiction: 'AE', type: 'Consultancy', risk: 'MEDIUM' },
    },
    {
      id: 'e-008',
      label: 'Influence Campaign Alpha',
      type: 'event',
      deception_score: 0.89,
      connections: ['e-004', 'e-005'],
      properties: {
        startDate: '2023-09-01',
        endDate: '2023-12-31',
        reach: '1.2M impressions',
        risk: 'CRITICAL',
      },
    },
  ],
  relationships: [
    {
      id: 'r-001',
      source: 'e-001',
      target: 'e-002',
      label: 'CONTROLS',
      weight: 0.9,
      timestamp: '2023-01-01',
    },
    {
      id: 'r-002',
      source: 'e-001',
      target: 'e-004',
      label: 'OPERATES',
      weight: 0.95,
      timestamp: '2023-01-15',
    },
    {
      id: 'r-003',
      source: 'e-001',
      target: 'e-005',
      label: 'AUTHORED',
      weight: 0.88,
      timestamp: '2023-09-15',
    },
    {
      id: 'r-004',
      source: 'e-002',
      target: 'e-003',
      label: 'REGISTERED_AT',
      weight: 0.6,
      timestamp: '2022-05-10',
    },
    {
      id: 'r-005',
      source: 'e-002',
      target: 'e-006',
      label: 'SENT',
      weight: 0.85,
      timestamp: '2023-11-02',
    },
    {
      id: 'r-006',
      source: 'e-002',
      target: 'e-007',
      label: 'PARTNER',
      weight: 0.5,
      timestamp: '2022-07-01',
    },
    {
      id: 'r-007',
      source: 'e-004',
      target: 'e-008',
      label: 'AMPLIFIED',
      weight: 0.92,
      timestamp: '2023-09-01',
    },
    {
      id: 'r-008',
      source: 'e-005',
      target: 'e-008',
      label: 'USED_IN',
      weight: 0.87,
      timestamp: '2023-09-05',
    },
    {
      id: 'r-009',
      source: 'e-003',
      target: 'e-007',
      label: 'CO_LOCATED',
      weight: 0.4,
      timestamp: '2022-08-01',
    },
  ],
  events: [
    {
      id: 'ev-001',
      timestamp: '2023-01-15T09:00:00Z',
      action: 'Account created: @sandstorm_truth',
      entityId: 'e-004',
      confidence: 0.99,
      result: 'confirmed',
      severity: 'high',
    },
    {
      id: 'ev-002',
      timestamp: '2023-05-20T14:30:00Z',
      action: 'Shell company Nexus Holdings registered in Cyprus',
      entityId: 'e-002',
      confidence: 0.95,
      result: 'confirmed',
      severity: 'high',
    },
    {
      id: 'ev-003',
      timestamp: '2023-09-01T00:00:00Z',
      action: 'Influence Campaign Alpha initiated',
      entityId: 'e-008',
      confidence: 0.91,
      result: 'confirmed',
      severity: 'critical',
    },
    {
      id: 'ev-004',
      timestamp: '2023-09-15T11:00:00Z',
      action: 'Propaganda Leaflet #7 distributed',
      entityId: 'e-005',
      confidence: 0.88,
      result: 'confirmed',
      severity: 'high',
    },
    {
      id: 'ev-005',
      timestamp: '2023-11-02T16:45:00Z',
      action: 'Wire transfer $240k: Nexus → Dubai Free Zone',
      entityId: 'e-006',
      confidence: 0.93,
      result: 'confirmed',
      severity: 'critical',
    },
    {
      id: 'ev-006',
      timestamp: '2023-12-01T08:00:00Z',
      action: 'Network expansion detected: 3 new accounts',
      entityId: 'e-004',
      confidence: 0.76,
      result: 'under review',
      severity: 'medium',
    },
    {
      id: 'ev-007',
      timestamp: '2023-12-31T23:59:00Z',
      action: 'Influence Campaign Alpha concluded (1.2M impressions)',
      entityId: 'e-008',
      confidence: 0.97,
      result: 'confirmed',
      severity: 'critical',
    },
    {
      id: 'ev-008',
      timestamp: '2024-01-10T10:00:00Z',
      action: 'Analyst flag: Morozov travel to Dubai corroborated',
      entityId: 'e-001',
      confidence: 0.82,
      result: 'confirmed',
      severity: 'medium',
    },
  ],
  reports: [
    {
      id: 'rep-001',
      title: 'Initial Assessment: Sandstorm Network',
      summary:
        'Preliminary analysis reveals a coordinated influence operation with financial flows through Cyprus-registered shell companies. Key actor Viktor Morozov linked to @sandstorm_truth account with 94% confidence.',
      entityIds: ['e-001', 'e-002', 'e-004'],
      createdAt: '2023-10-01T12:00:00Z',
      status: 'final',
    },
    {
      id: 'rep-002',
      title: 'Financial Flow Analysis',
      summary:
        'Wire transfers totaling $240,000 traced from Nexus Holdings LLC through Dubai Free Zone intermediary. Funds likely used to finance Influence Campaign Alpha.',
      entityIds: ['e-002', 'e-003', 'e-006', 'e-007'],
      createdAt: '2023-11-15T09:30:00Z',
      status: 'review',
    },
    {
      id: 'rep-003',
      title: 'Campaign Impact Assessment',
      summary:
        'Draft analysis of Influence Campaign Alpha\'s reach (1.2M impressions). Propaganda Leaflet #7 identified as primary content vector. Attribution confidence: HIGH.',
      entityIds: ['e-004', 'e-005', 'e-008'],
      createdAt: '2024-01-05T14:00:00Z',
      status: 'draft',
    },
  ],
};

const MOCK_CASE_LIST = [
  { id: 'case-001', title: 'Operation Sandstorm' },
  { id: 'case-002', title: 'Project Nighthawk' },
  { id: 'case-003', title: 'Task Force Meridian' },
];

// ---------------------------------------------------------------------------
// Mock adapter implementation
// ---------------------------------------------------------------------------
const SIMULATED_LATENCY_MS = 600;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockAnalystAdapter: AnalystAdapter = {
  async getCase(caseId: string): Promise<CaseData> {
    await delay(SIMULATED_LATENCY_MS);
    if (caseId === 'case-001') return MOCK_CASE;
    throw new Error(`Case ${caseId} not found`);
  },

  async searchCases(
    query: string,
  ): Promise<Array<{ id: string; title: string }>> {
    await delay(200);
    const q = query.toLowerCase();
    return MOCK_CASE_LIST.filter((c) => c.title.toLowerCase().includes(q));
  },
};

// ---------------------------------------------------------------------------
// Live adapter stub (replace with real fetch calls when backend is ready)
// ---------------------------------------------------------------------------
export const liveAnalystAdapter: AnalystAdapter = {
  async getCase(caseId: string): Promise<CaseData> {
    const res = await fetch(`/api/cases/${caseId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async searchCases(
    query: string,
  ): Promise<Array<{ id: string; title: string }>> {
    const res = await fetch(
      `/api/cases?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};

// Feature-flag: set VITE_USE_LIVE_API=true to switch to live
export const analystAdapter: AnalystAdapter =
  import.meta.env.VITE_USE_LIVE_API === 'true'
    ? liveAnalystAdapter
    : mockAnalystAdapter;
