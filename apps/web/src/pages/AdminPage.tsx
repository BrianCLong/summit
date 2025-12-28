import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { trackGoldenPathStep } from '@/telemetry/metrics'
import { markStepComplete } from '@/lib/activation'
import { ContextualNudge } from '@/components/activation/ContextualNudge'
import MergeRollbackPanel from '@/components/admin/MergeRollbackPanel'
import { useToast } from '@/hooks/use-toast'

export default function AdminPage() {
  const { toast } = useToast()

  const handleCreateTenant = () => {
    trackGoldenPathStep('tenant_created')
    markStepComplete('tenant_created')
    toast({
      title: 'Tenant request recorded',
      description:
        'Tenant provisioning is managed through release operations for MVP-3-GA.',
    })
  }

  return (
    <div className="p-6">
      <ContextualNudge
        stepId="tenant_created"
        title="Setup Organization"
        description="Tenant setup is required before workspace access is enabled."
        actionLabel="Request Tenant"
        onAction={handleCreateTenant}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <Button onClick={handleCreateTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Request Tenant
        </Button>
      </div>
      <EmptyState
        title="Administrative controls are gated"
        description="User management and tenant provisioning are handled through release operations for MVP-3-GA."
        icon="alert"
      />
      <div className="mt-8">
        <MergeRollbackPanel />
      </div>
    </div>
  )
}
