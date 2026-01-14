// @ts-nocheck
import React, { useEffect } from 'react'
import { IngestionWizard } from '@/features/ingestion/IngestionWizard'
import { useDemoMode } from '@/components/common/DemoIndicator'
import { getMilestoneStatus, setMilestoneStatus } from '@/lib/firstRunFunnel'
import { trackFirstRunEvent } from '@/telemetry/metrics'

export default function DataSourcesPage() {
  const isDemoMode = useDemoMode()

  useEffect(() => {
    if (getMilestoneStatus('connect_data_source') === 'not_started') {
      const nextStatus = setMilestoneStatus(
        'connect_data_source',
        'in_progress'
      )
      trackFirstRunEvent('first_run_milestone_started', {
        milestoneId: 'connect_data_source',
        status: nextStatus,
        source: 'data_sources_page',
      })
    }
  }, [])

  useEffect(() => {
    if (isDemoMode) {
      if (getMilestoneStatus('connect_data_source') !== 'complete') {
        const nextStatus = setMilestoneStatus(
          'connect_data_source',
          'complete'
        )
        trackFirstRunEvent('first_run_milestone_completed', {
          milestoneId: 'connect_data_source',
          status: nextStatus,
          source: 'demo_seed',
        })
      }
    }
  }, [isDemoMode])

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Data Sources & Ingestion</h1>
        <p className="text-gray-500 mt-1">
          Upload and map external data to IntelGraph canonical entities.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <IngestionWizard />
      </div>
    </div>
  )
}
