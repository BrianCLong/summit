import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

interface GatedSurfaceNoticeProps {
  title: string
  summary: string
  details?: string[]
}

const defaultDetails = [
  'Availability: gated in MVP-3-GA.',
  'Configuration is managed through release operations workflows.',
  'Contact your Summit administrator if access is required.',
]

export default function GatedSurfaceNotice({
  title,
  summary,
  details = defaultDetails,
}: GatedSurfaceNoticeProps) {
  return (
    <div className="rounded-lg border border-muted bg-background px-6 py-10">
      <EmptyState
        icon="alert"
        title={title}
        description={summary}
        className="px-4"
      />
      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        {details.map((detail) => (
          <li key={detail} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
