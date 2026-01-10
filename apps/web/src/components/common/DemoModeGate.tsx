import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isDemoModeEnabled } from '@/lib/demoMode'

export function DemoModeGate({ children }: { children: React.ReactElement }) {
  const location = useLocation()

  if (!isDemoModeEnabled()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
