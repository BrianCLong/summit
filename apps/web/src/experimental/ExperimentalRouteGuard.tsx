import React from 'react'
import { NotFound } from '@/components/error'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagContext'

const allowedRoles = new Set(['admin', 'experimental', 'preview'])

export function ExperimentalRouteGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const { isEnabled, loading } = useFeatureFlags()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading experimental lane...
      </div>
    )
  }

  const hasFlag = isEnabled('exp.preview_lane', false)
  const hasRole = user?.role ? allowedRoles.has(user.role) : false

  if (!hasFlag || !hasRole) {
    return <NotFound />
  }

  return <>{children}</>
}
