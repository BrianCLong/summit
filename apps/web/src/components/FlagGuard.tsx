import React, { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRbacMultiple } from '@/hooks/useRbac'
import { DisabledOverlay } from './DisabledOverlay'

interface FlagProps {
  required: { resource: string; action: string }[]
  fallback?: ReactNode
  children: ReactNode
}

export function FlagGuard({ required, children, fallback }: FlagProps) {
  const { user, loading: authLoading } = useAuth()

  const { hasAllPermissions, loading: rbacLoading } = useRbacMultiple(required, {
    user,
    fallback: false
  })

  if (authLoading || rbacLoading) {
    return null
  }

  if (!hasAllPermissions) {
    if (fallback) return <>{fallback}</>
    return <DisabledOverlay>{children}</DisabledOverlay>
  }

  return <>{children}</>
}
