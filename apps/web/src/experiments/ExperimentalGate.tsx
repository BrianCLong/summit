import React, { useMemo } from 'react'
import { useFeatureFlags } from '@/contexts/FeatureFlagContext'
import { ExperimentalBanner } from './ExperimentalBanner'
import { evaluateExperiment, warnOnInvalidExperimentalRegistry } from './evaluate'

interface ExperimentalGateProps {
  experimentId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ExperimentalGate({ experimentId, children, fallback = null }: ExperimentalGateProps) {
  const { isEnabled } = useFeatureFlags()

  const decision = useMemo(() => {
    warnOnInvalidExperimentalRegistry()
    return evaluateExperiment(experimentId, isEnabled)
  }, [experimentId, isEnabled])

  if (!decision.enabled) {
    return <>{fallback}</>
  }

  return (
    <>
      <ExperimentalBanner />
      {children}
    </>
  )
}
