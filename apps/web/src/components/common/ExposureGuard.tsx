import React from 'react'
import { Navigate } from 'react-router-dom'
import { isSurfaceAllowed, type ExposureSurfaceId } from '@/exposure/exposureConfig'

interface ExposureGuardProps {
  surface: ExposureSurfaceId
  children: React.ReactElement
}

export function ExposureGuard({ surface, children }: ExposureGuardProps) {
  if (!isSurfaceAllowed(surface)) {
    return <Navigate to="/access-denied" replace />
  }

  return children
}

export default ExposureGuard
