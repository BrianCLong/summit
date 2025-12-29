import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'

interface DataIntegrityNoticeProps {
  mode: 'demo' | 'unavailable'
  context?: string
}

const copy = {
  demo: {
    title: 'Demo data in use',
    description:
      'This view is populated with synthetic records for demonstration. Do not treat values as live operational data.',
    badge: 'DEMO',
  },
  unavailable: {
    title: 'Live data not connected',
    description:
      'This view requires a configured backend connection. Connect the production data source to populate live records.',
    badge: 'DISCONNECTED',
  },
}

export function DataIntegrityNotice({
  mode,
  context,
}: DataIntegrityNoticeProps): React.ReactElement {
  const content = copy[mode]
  return (
    <Alert variant="warning" className="flex items-start justify-between gap-4">
      <div>
        <AlertTitle className="flex items-center gap-2">
          {content.title}
          {context ? (
            <span className="text-xs font-normal text-muted-foreground">
              {context}
            </span>
          ) : null}
        </AlertTitle>
        <AlertDescription>{content.description}</AlertDescription>
      </div>
      <Badge variant={mode === 'demo' ? 'warning' : 'secondary'}>
        {content.badge}
      </Badge>
    </Alert>
  )
}

export default DataIntegrityNotice
