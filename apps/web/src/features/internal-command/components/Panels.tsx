import React from 'react'
import { StatusPanel } from './StatusPanel'
import { useCommandStatus } from '../useCommandStatus'

export function GovernancePanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="Governance"
      status={state.statuses.governance}
      fallbackTitle="Governance & Controls"
    />
  )
}

export function AgentControlPanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="Agent Control"
      status={state.statuses.agents}
      fallbackTitle="Agent Control"
    />
  )
}

export function CIStatusPanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="CI / Quality"
      status={state.statuses.ci}
      fallbackTitle="CI"
    />
  )
}

export function ReleasePanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="Release Train"
      status={state.statuses.releases}
      fallbackTitle="Release"
    />
  )
}

export function ZKIsolationPanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="ZK Isolation"
      status={state.statuses.zk}
      fallbackTitle="ZK Isolation"
    />
  )
}

export function StreamingPanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="Streaming"
      status={state.statuses.streaming}
      fallbackTitle="Streaming"
    />
  )
}

export function GAReadinessPanel() {
  const { state } = useCommandStatus()
  return (
    <StatusPanel
      title="GA Readiness"
      status={state.statuses.ga}
      fallbackTitle="GA"
    />
  )
}
