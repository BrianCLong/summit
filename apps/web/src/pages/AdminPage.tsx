import React, { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { trackGoldenPathStep } from '@/telemetry/metrics'
import { markStepComplete } from '@/lib/activation'
import { ContextualNudge } from '@/components/activation/ContextualNudge'
import MergeRollbackPanel from '@/components/admin/MergeRollbackPanel'

type DemoTenantResponse = {
  tenantId: string
  slug: string
  workflows: string[]
  evidenceSeed: {
    events: number
    windowStart: string
    windowEnd: string
  }
}

type EvidenceExportStatus = {
  tenantId: string
  windowStart: string
  windowEnd: string
  eventCount: number
  lastEventAt: string | null
  policyBundleReady: boolean
  ready: boolean
}

export default function AdminPage() {
  const [demoTenant, setDemoTenant] = useState<DemoTenantResponse | null>(null)
  const [demoStatus, setDemoStatus] = useState<EvidenceExportStatus | null>(
    null
  )
  const [demoLoading, setDemoLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  const handleCreateTenant = () => {
    trackGoldenPathStep('tenant_created')
    markStepComplete('tenant_created')
    // TODO: Add toast notification when component is implemented
    console.log('Tenant created successfully')
  }

  const fetchEvidenceStatus = async (tenantId: string) => {
    setStatusLoading(true)
    try {
      const response = await fetch(
        `/api/evidence/exports/status?tenantId=${tenantId}`
      )
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load export status')
      }
      setDemoStatus(payload.data as EvidenceExportStatus)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleCreateDemoTenant = async () => {
    setDemoLoading(true)
    setDemoError(null)
    try {
      const response = await fetch('/api/tenants/demo', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create demo tenant')
      }
      const data = payload.data as DemoTenantResponse
      setDemoTenant(data)
      await fetchEvidenceStatus(data.tenantId)
    } catch (error) {
      setDemoError(
        error instanceof Error ? error.message : 'Failed to create demo tenant'
      )
    } finally {
      setDemoLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    if (!demoTenant) return
    await fetchEvidenceStatus(demoTenant.tenantId)
  }

  return (
    <div className="p-6">
      <ContextualNudge
        stepId="tenant_created"
        title="Setup Organization"
        description="Create your first tenant organization to get started."
        actionLabel="Create Tenant"
        onAction={handleCreateTenant}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <Button onClick={handleCreateTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Demo Tenant Bootstrap
            </h2>
            <p className="text-sm text-gray-600">
              Spin up a demo tenant with seeded workflows and evidence export
              readiness.
            </p>
          </div>
          <Button onClick={handleCreateDemoTenant} disabled={demoLoading}>
            {demoLoading ? 'Creating…' : 'Create Demo Tenant'}
          </Button>
        </div>
        {demoError ? (
          <p className="mt-4 text-sm text-red-600">{demoError}</p>
        ) : null}
        {demoTenant ? (
          <div className="mt-6 space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">Tenant:</span>{' '}
              {demoTenant.slug} ({demoTenant.tenantId})
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                Seeded workflows:
              </span>{' '}
              {demoTenant.workflows.length}
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                Evidence seed window:
              </span>{' '}
              {new Date(demoTenant.evidenceSeed.windowStart).toLocaleString()} →{' '}
              {new Date(demoTenant.evidenceSeed.windowEnd).toLocaleString()}
            </div>
          </div>
        ) : null}
        <div className="mt-6 rounded-md border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Evidence Export Status
            </h3>
            <Button
              variant="secondary"
              onClick={handleRefreshStatus}
              disabled={!demoTenant || statusLoading}
            >
              {statusLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {demoStatus ? (
            <div className="mt-3 grid gap-2 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">Ready:</span>{' '}
                {demoStatus.ready ? 'Yes' : 'Not yet'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Policy bundle:
                </span>{' '}
                {demoStatus.policyBundleReady ? 'Loaded' : 'Missing'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Event count:
                </span>{' '}
                {demoStatus.eventCount}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Last event:</span>{' '}
                {demoStatus.lastEventAt
                  ? new Date(demoStatus.lastEventAt).toLocaleString()
                  : 'No events yet'}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              Create a demo tenant to view export readiness.
            </p>
          )}
        </div>
      </div>
      <EmptyState
        title="Admin page under construction"
        description="This will show administrative controls and user management"
        icon="plus"
      />
      <div className="mt-8">
        <MergeRollbackPanel />
      </div>
    </div>
  )
}
