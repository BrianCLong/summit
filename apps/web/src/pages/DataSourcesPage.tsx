// @ts-nocheck
import React from 'react'
import { IngestionWizard } from '@/features/ingestion/IngestionWizard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function DataSourcesPage() {
  return (
    <div className="p-[var(--ds-space-xl)] min-h-screen bg-[color:var(--ds-color-background)]">
      <div className="mb-[var(--ds-space-xl)]">
        <h1 className="text-[var(--ds-font-size-xl)] font-[var(--ds-font-weight-semibold)] text-[color:var(--ds-color-foreground)]">
          Data Sources & Ingestion
        </h1>
        <p className="text-[var(--ds-font-size-sm)] text-muted-foreground mt-[var(--ds-space-2xs)]">
          Upload and map external data to IntelGraph canonical entities.
        </p>
      </div>

      <Alert variant="info" className="mb-[var(--ds-space-lg)]">
        <AlertTitle>Ingestion readiness</AlertTitle>
        <AlertDescription>
          Validate connectors before ingesting to keep the provenance ledger
          consistent.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion setup</CardTitle>
        </CardHeader>
        <CardContent className="p-[var(--ds-space-xs)]">
          <IngestionWizard />
        </CardContent>
      </Card>
    </div>
  )
}
