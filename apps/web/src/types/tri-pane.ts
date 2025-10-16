// Types for the tri-pane analysis view

export interface Entity {
  id: string
  name: string
  type:
    | 'PERSON'
    | 'ORGANIZATION'
    | 'LOCATION'
    | 'IP_ADDRESS'
    | 'DOMAIN'
    | 'EMAIL'
    | 'FILE'
    | 'PROJECT'
    | 'SYSTEM'
  confidence: number
  properties: Record<string, any>
  lastSeen?: string
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: string
  confidence: number
  properties: Record<string, any>
  createdAt: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  timestamp: string
  type: string
  entityId?: string
  confidence: number
  metadata: Record<string, any>
}

export interface GeospatialEvent {
  id: string
  entityId?: string
  latitude: number
  longitude: number
  timestamp: string
  type: string
  properties: Record<string, any>
}

export interface GraphLayout {
  type: 'force' | 'radial' | 'hierarchic' | 'circular'
  options?: Record<string, any>
}

export interface PanelProps<T> {
  data: T
  loading?: boolean
  error?: Error | null
  className?: string
}

// Utility functions for date formatting
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}
