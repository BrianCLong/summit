// Unit Tests for GovernanceMetricsDashboard
// Tests ODNI 85% validation tracking, incident trends, and compliance gaps display

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { GovernanceMetricsDashboard } from '../GovernanceMetricsDashboard';
import { gql } from '@apollo/client';

// GraphQL Query Mock
const GET_GOVERNANCE_METRICS = gql`
  query GetGovernanceMetrics($input: GovernanceMetricsInput!) {
    governanceMetrics(input: $input) {
      validationRate {
        totalDecisions
        validatedDecisions
        validationRate
        targetRate
        trend
        breakdown {
          category
          validated
          total
          rate
          compliant
        }
        lastUpdated
        meetsODNIRequirement
      }
      incidentTrends {
        current {
          totalIncidents
          resolvedIncidents
          mttr
          startDate
          endDate
        }
        previous {
          totalIncidents
        }
        trend
        byCategory {
          name
          count
          percentOfTotal
          trend
        }
        bySeverity {
          severity
          count
          percentOfTotal
          avgResolutionTime
        }
        timeline {
          timestamp
          incidents
          resolved
          validationRate
        }
      }
      complianceGaps {
        id
        framework
        requirement
        category
        severity
        description
        currentState
        requiredState
        remediationPlan
        dueDate
        owner
        status
        daysUntilDue
      }
      riskScore {
        overall
        components {
          name
          score
          status
        }
        trend
        riskLevel
      }
      auditTrail {
        id
        timestamp
        eventType
        actor
        resource
        action
        outcome
        riskLevel
      }
      modelGovernance {
        totalModels
        approvedModels
        pendingReview
        rejectedModels
        deploymentMetrics {
          totalDeployments
          successfulDeployments
          failedDeployments
          successRate
        }
        biasMetrics {
          modelsAudited
          biasDetected
          biasRemediations
          detectionRate
        }
        approvalRate
      }
      overallCompliance {
        isCompliant
        validationMeetsODNI
        criticalGapsCount
        highGapsCount
        riskLevel
      }
      timestamp
    }
  }
`;

// Mock data factory
const createMockMetrics = (overrides: Partial<any> = {}) => ({
  validationRate: {
    totalDecisions: 10000,
    validatedDecisions: 8700,
    validationRate: 87.0,
    targetRate: 85,
    trend: 'UP',
    breakdown: [
      { category: 'Classification', validated: 4500, total: 5000, rate: 90.0, compliant: true },
      { category: 'Detection', validated: 4200, total: 5000, rate: 84.0, compliant: false },
    ],
    lastUpdated: Date.now(),
    meetsODNIRequirement: true,
  },
  incidentTrends: {
    current: {
      totalIncidents: 15,
      resolvedIncidents: 12,
      mttr: 3600,
      startDate: Date.now() - 86400000,
      endDate: Date.now(),
    },
    previous: {
      totalIncidents: 20,
    },
    trend: 'DOWN',
    byCategory: [
      { name: 'Security', count: 5, percentOfTotal: 33.3, trend: 'DOWN' },
      { name: 'Performance', count: 7, percentOfTotal: 46.7, trend: 'STABLE' },
      { name: 'Data Quality', count: 3, percentOfTotal: 20.0, trend: 'UP' },
    ],
    bySeverity: [
      { severity: 'CRITICAL', count: 1, percentOfTotal: 6.7, avgResolutionTime: 1800 },
      { severity: 'HIGH', count: 4, percentOfTotal: 26.7, avgResolutionTime: 3600 },
      { severity: 'MEDIUM', count: 6, percentOfTotal: 40.0, avgResolutionTime: 7200 },
      { severity: 'LOW', count: 4, percentOfTotal: 26.6, avgResolutionTime: 14400 },
    ],
    timeline: [],
  },
  complianceGaps: [
    {
      id: 'gap-1',
      framework: 'SOC2',
      requirement: 'CC6.1',
      category: 'Access Control',
      severity: 'HIGH',
      description: 'MFA not enforced for all privileged accounts',
      currentState: 'MFA enabled for 90% of accounts',
      requiredState: 'MFA required for 100% of privileged accounts',
      remediationPlan: 'Enable MFA for remaining accounts',
      dueDate: Date.now() + 7 * 86400000,
      owner: 'security-team',
      status: 'IN_PROGRESS',
      daysUntilDue: 7,
    },
  ],
  riskScore: {
    overall: 75,
    components: [
      { name: 'Data Security', score: 85, status: 'HEALTHY' },
      { name: 'Access Control', score: 70, status: 'WARNING' },
      { name: 'Compliance', score: 72, status: 'WARNING' },
    ],
    trend: 'UP',
    riskLevel: 'MEDIUM',
  },
  auditTrail: [
    {
      id: 'audit-1',
      timestamp: Date.now() - 3600000,
      eventType: 'POLICY_CHANGE',
      actor: 'admin@example.com',
      resource: 'retention-policy',
      action: 'updated',
      outcome: 'SUCCESS',
      riskLevel: 'LOW',
    },
  ],
  modelGovernance: {
    totalModels: 50,
    approvedModels: 45,
    pendingReview: 3,
    rejectedModels: 2,
    deploymentMetrics: {
      totalDeployments: 100,
      successfulDeployments: 95,
      failedDeployments: 5,
      successRate: 95.0,
    },
    biasMetrics: {
      modelsAudited: 45,
      biasDetected: 3,
      biasRemediations: 2,
      detectionRate: 6.7,
    },
    approvalRate: 90.0,
  },
  overallCompliance: {
    isCompliant: true,
    validationMeetsODNI: true,
    criticalGapsCount: 0,
    highGapsCount: 1,
    riskLevel: 'MEDIUM',
  },
  timestamp: Date.now(),
  ...overrides,
});

const createMock = (metrics: any) => [
  {
    request: {
      query: GET_GOVERNANCE_METRICS,
      variables: {
        input: {
          tenantId: 'test-tenant',
          timeRange: expect.any(Object),
          includeHistorical: true,
        },
      },
    },
    result: {
      data: {
        governanceMetrics: metrics,
      },
    },
  },
];

describe('GovernanceMetricsDashboard', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
    realTimeEnabled: false,
  };

  describe('ODNI 85% Validation Tracking', () => {
    it('should display validation rate that meets ODNI requirement', async () => {
      const metrics = createMockMetrics({
        validationRate: {
          ...createMockMetrics().validationRate,
          validationRate: 87.0,
          meetsODNIRequirement: true,
        },
      });

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('87.0%')).toBeInTheDocument();
      });

      expect(screen.getByText('85% Target')).toBeInTheDocument();
    });

    it('should show warning when validation rate is below 85%', async () => {
      const metrics = createMockMetrics({
        validationRate: {
          ...createMockMetrics().validationRate,
          validationRate: 82.0,
          meetsODNIRequirement: false,
        },
        overallCompliance: {
          ...createMockMetrics().overallCompliance,
          isCompliant: false,
          validationMeetsODNI: false,
        },
      });

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Compliance Issues Detected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/ODNI Validation Rate below 85%/i)).toBeInTheDocument();
    });

    it('should display validation breakdown by category', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('ODNI Validation Rate')).toBeInTheDocument();
      });

      // Click on Validation tab
      fireEvent.click(screen.getByText('Validation'));

      await waitFor(() => {
        expect(screen.getByText('Classification')).toBeInTheDocument();
        expect(screen.getByText('Detection')).toBeInTheDocument();
      });
    });
  });

  describe('Incident Trends', () => {
    it('should display current incident statistics', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        // Active incidents = total - resolved = 15 - 12 = 3
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should display incident breakdown by severity', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      // Click on Incidents tab
      await waitFor(() => {
        expect(screen.getByText('Incidents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Incidents'));

      await waitFor(() => {
        expect(screen.getByText('By Severity')).toBeInTheDocument();
      });
    });

    it('should show MTTR in human-readable format', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        // MTTR: 3600 seconds = 60 minutes
        expect(screen.getByText('MTTR: 60m')).toBeInTheDocument();
      });
    });
  });

  describe('Compliance Gaps Display', () => {
    it('should display compliance gaps count', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Compliance Gaps')).toBeInTheDocument();
      });
    });

    it('should display compliance gap details in table', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      // Click on Compliance Gaps tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Compliance Gaps/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: /Compliance Gaps/i }));

      await waitFor(() => {
        expect(screen.getByText('SOC2')).toBeInTheDocument();
        expect(screen.getByText('CC6.1')).toBeInTheDocument();
        expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      });
    });

    it('should highlight critical compliance gaps', async () => {
      const metrics = createMockMetrics({
        complianceGaps: [
          {
            ...createMockMetrics().complianceGaps[0],
            severity: 'CRITICAL',
          },
        ],
        overallCompliance: {
          ...createMockMetrics().overallCompliance,
          criticalGapsCount: 1,
        },
      });

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('1 critical')).toBeInTheDocument();
      });
    });

    it('should show days until due date', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      fireEvent.click(screen.getByRole('tab', { name: /Compliance Gaps/i }));

      await waitFor(() => {
        expect(screen.getByText('7 days')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Score', () => {
    it('should display overall risk score', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Risk Score')).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
      });
    });

    it('should display risk level chip', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });
  });

  describe('Model Governance', () => {
    it('should display model statistics', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      fireEvent.click(screen.getByRole('tab', { name: /Model Governance/i }));

      await waitFor(() => {
        expect(screen.getByText('Total Models')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('should display deployment metrics', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      fireEvent.click(screen.getByRole('tab', { name: /Model Governance/i }));

      await waitFor(() => {
        expect(screen.getByText('Deployment Metrics')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('95.0%')).toBeInTheDocument();
      });
    });

    it('should display bias metrics', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      fireEvent.click(screen.getByRole('tab', { name: /Model Governance/i }));

      await waitFor(() => {
        expect(screen.getByText('Bias Detection & Remediation')).toBeInTheDocument();
        expect(screen.getByText('Models Audited')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Controls', () => {
    it('should allow changing time range', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Time Range')).toBeInTheDocument();
      });

      // Open time range dropdown
      fireEvent.mouseDown(screen.getByLabelText('Time Range'));

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });
    });

    it('should have auto-refresh toggle', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Auto-refresh')).toBeInTheDocument();
      });
    });

    it('should have refresh button', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh Now/i })).toBeInTheDocument();
      });
    });

    it('should call onExport when export button is clicked', async () => {
      const mockExport = jest.fn();
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} onExport={mockExport} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export Data/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Export Data/i }));

      expect(mockExport).toHaveBeenCalledWith('csv');
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      const metrics = createMockMetrics();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
      });

      // Click on each tab
      const tabs = ['Overview', 'Validation', 'Incidents', 'Compliance Gaps', 'Model Governance'];
      for (const tab of tabs) {
        fireEvent.click(screen.getByRole('tab', { name: new RegExp(tab, 'i') }));
        await waitFor(() => {
          expect(screen.getByRole('tab', { name: new RegExp(tab, 'i') })).toHaveAttribute(
            'aria-selected',
            'true'
          );
        });
      }
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner while fetching data', () => {
      render(
        <MockedProvider mocks={[]} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error message on query failure', async () => {
      const errorMock = [
        {
          request: {
            query: GET_GOVERNANCE_METRICS,
            variables: {
              input: {
                tenantId: 'test-tenant',
                timeRange: expect.any(Object),
                includeHistorical: true,
              },
            },
          },
          error: new Error('Failed to fetch governance metrics'),
        },
      ];

      render(
        <MockedProvider mocks={errorMock} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Governance Metrics/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance (p95 < 2s)', () => {
    it('should render dashboard content within acceptable time', async () => {
      const metrics = createMockMetrics();
      const startTime = performance.now();

      render(
        <MockedProvider mocks={createMock(metrics)} addTypename={false}>
          <GovernanceMetricsDashboard {...defaultProps} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('AI Governance Dashboard')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete well under 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });
  });
});
