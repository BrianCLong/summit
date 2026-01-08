import { render, screen, waitFor } from '@testing-library/react'
import InternalCommandDashboard from './InternalCommandDashboard'
import { AuthProvider } from '@/contexts/AuthContext'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'

// Mock fetch
global.fetch = vi.fn(url => {
  if (url.toString().includes('/api/internal')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'green',
          details: {
            checklist: { governance: true },
            activeAgents: { 'tier-1': 1 },
            openPRs: { 'tier-1': 1 },
            isolationViolations: 0,
            eventIngestionRate: 100,
            evidenceBundleCompleteness: 1.0,
            lastTier4Approval: new Date().toISOString(),
            killSwitchStatus: 'inactive',
            budgetUsagePercent: 50,
            topRiskScores: [],
            ciPassRate: 1.0,
            governanceFailures24h: 0,
            currentTrain: 'stable',
            lastReleaseHash: 'abcdef',
            zkProtocolVersion: 'v1',
            streamLagMs: 10,
            featureFreshnessMs: 10,
          },
          message: 'Mocked',
        }),
    })
  }
  return Promise.resolve({ ok: false })
}) as any

describe('InternalCommandDashboard', () => {
  it('renders dashboard shell and panels', async () => {
    render(
      <AuthProvider>
        <InternalCommandDashboard />
      </AuthProvider>
    )

    // Check for header
    expect(screen.getByText('SUMMIT COMMAND DASHBOARD')).toBeInTheDocument()

    // Check for panel loading/content
    // Wait for async fetch
    await waitFor(() => {
      // Governance Panel Title
      expect(screen.getByText('Governance')).toBeInTheDocument()
      // GA Readiness Panel Title
      expect(screen.getByText('GA Readiness')).toBeInTheDocument()
    })
  })
})
