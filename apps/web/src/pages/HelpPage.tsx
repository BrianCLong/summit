import React, { useMemo, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { useTenant } from '@/contexts/TenantContext'

export default function HelpPage() {
  const { currentTenant } = useTenant()
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [exportMessage, setExportMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

  const tenantId = currentTenant?.id || 'tenant-id'
  const impersonationCurl = useMemo(
    () =>
      `curl -X POST /api/v1/support/impersonation/start \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"targetUserId\":\"user-id\",\"targetTenantId\":\"${tenantId}\",\"reason\":\"Support investigation\"}'`,
    [tenantId]
  )

  const handleExportBundle = async () => {
    if (!currentTenant) {
      setExportStatus('error')
      setExportMessage('Select a tenant to export a health bundle.')
      return
    }

    setExportStatus('loading')
    setExportMessage('Generating tenant health bundle...')

    try {
      const response = await fetch('/api/v1/support/tenant-health-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          reason: 'Support panel health bundle export',
        }),
      })

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`)
      }

      const payload = await response.json()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tenant-health-bundle-${currentTenant.id}.json`
      anchor.click()
      URL.revokeObjectURL(url)

      setExportStatus('success')
      setExportMessage('Tenant health bundle downloaded.')
    } catch (error) {
      setExportStatus('error')
      setExportMessage(
        'Health bundle export failed. Verify feature flags and policy access.'
      )
    }
  }

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(impersonationCurl)
      setCopyMessage('Impersonation cURL copied to clipboard.')
    } catch (error) {
      setCopyMessage('Copy failed. Use the command displayed below.')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Help & Documentation</h1>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Tenant health bundle export</CardTitle>
            <CardDescription>
              Export a redacted tenant health bundle for support and compliance
              review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tenant: <span className="font-medium">{tenantId}</span>
            </p>
            {exportMessage && (
              <p className="mt-2 text-sm text-muted-foreground">
                {exportMessage}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleExportBundle}
              disabled={exportStatus === 'loading'}
            >
              {exportStatus === 'loading' ? 'Preparing...' : 'Download bundle'}
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Support impersonation flow</CardTitle>
            <CardDescription>
              Start or stop policy-gated impersonation sessions for approved
              support operators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap rounded-md bg-slate-900 text-slate-100 p-3">
              {impersonationCurl}
            </pre>
            {copyMessage && (
              <p className="mt-2 text-sm text-muted-foreground">
                {copyMessage}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleCopyCurl}>
              Copy cURL
            </Button>
          </CardFooter>
        </Card>
      </div>
      <EmptyState
        title="Help page under construction"
        description="This will show documentation and support resources"
        icon="plus"
      />
    </div>
  )
}
