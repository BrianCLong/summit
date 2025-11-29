import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { trackGoldenPathStep } from '@/telemetry/metrics'
import { markStepComplete } from '@/lib/activation'
import { useToast } from '@/components/ui/Toast'
import { ContextualNudge } from '@/components/activation/ContextualNudge'

export default function AdminPage() {
  const { toast } = useToast()

  const handleCreateTenant = () => {
    trackGoldenPathStep('tenant_created')
    markStepComplete('tenant_created')
    toast({
      title: 'Tenant Created',
      description: 'Your new tenant organization has been provisioned.',
      variant: 'success',
    })
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
      <EmptyState
        title="Admin page under construction"
        description="This will show administrative controls and user management"
        icon="plus"
      />
    </div>
  )
}
