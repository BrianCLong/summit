import * as React from 'react'
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
  List,
  GitCommit, // For narrative view icon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRelativeTime } from '@/lib/utils'
import type { TimelineEvent, PanelProps } from '@/types'
import { cn } from '@/lib/utils'

interface TimelineRailProps extends PanelProps<TimelineEvent[]> {
  onTimeRangeChange?: (range: { start: string; end: string }) => void
  onEventSelect?: (event: TimelineEvent) => void
  selectedEventId?: string
  autoScroll?: boolean
}

type ViewMode = 'list' | 'narrative'

export function TimelineRail({
  data: events,
  loading = false,
  error,
  onTimeRangeChange,
  onEventSelect,
  selectedEventId,
  autoScroll = true,
  className,
}: TimelineRailProps) {
  const [timeRange, setTimeRange] = React.useState<{
    start: string
    end: string
  }>({
    start: '',
    end: '',
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const timelineRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to latest events
  React.useEffect(() => {
    if (autoScroll && timelineRef.current && events.length > 0) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight
    }
  }, [events, autoScroll, viewMode])

  const sortedEvents = React.useMemo(() => {
    return [...events].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [events])

  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {}

    sortedEvents.forEach(event => {
      const date = new Date(event.timestamp).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
    })

    return groups
  }, [sortedEvents])

  // Narrative view: Identify key story points or high-priority events
  const narrativeEvents = React.useMemo(() => {
    if (viewMode !== 'narrative') return []
    // Filter for "significant" events for the narrative view
    // In a real app, this logic might be more complex or driven by an 'significance' score
    return sortedEvents.filter(e =>
      ['investigation_started', 'threat_detected', 'alert_triggered', 'analysis_completed'].includes(e.type) ||
      (e.metadata as any)?.significance === 'high'
    )
  }, [sortedEvents, viewMode])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'entity_created':
        return '➕'
      case 'entity_updated':
        return '✏️'
      case 'relationship_created':
        return '🔗'
      case 'alert_triggered':
        return '🚨'
      case 'investigation_started':
        return '🔍'
      case 'threat_detected':
        return '⚠️'
      case 'analysis_completed':
        return '📊'
      default:
        return '📍'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'entity_created':
        return 'border-green-500'
      case 'entity_updated':
        return 'border-blue-500'
      case 'relationship_created':
        return 'border-purple-500'
      case 'alert_triggered':
        return 'border-red-500'
      case 'investigation_started':
        return 'border-yellow-500'
      case 'threat_detected':
        return 'border-orange-500'
      case 'analysis_completed':
        return 'border-cyan-500'
      default:
        return 'border-gray-500'
    }
  }

  const navigateTime = (direction: 'prev' | 'next') => {
    // Implement time navigation logic
    console.log('Navigate time:', direction)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive">Timeline Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {viewMode === 'list' ? 'Timeline' : 'Narrative'}
            <Badge variant="secondary" className="text-xs">
              {viewMode === 'list' ? events.length : narrativeEvents.length} events
            </Badge>
          </div>
          <div className="flex gap-1 items-center">
             <div className="flex bg-muted rounded-md p-0.5 mr-2">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'narrative' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode('narrative')}
                title="Narrative View"
              >
                <GitCommit className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateTime('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 w-8"
            >
              <Filter className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateTime('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {showFilters && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg mt-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Time Range Filter
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={timeRange.start}
                onChange={e => {
                  const newRange = { ...timeRange, start: e.target.value }
                  setTimeRange(newRange)
                  onTimeRangeChange?.(newRange)
                }}
                className="px-2 py-1 text-xs border rounded"
              />
              <input
                type="datetime-local"
                value={timeRange.end}
                onChange={e => {
                  const newRange = { ...timeRange, end: e.target.value }
                  setTimeRange(newRange)
                  onTimeRangeChange?.(newRange)
                }}
                className="px-2 py-1 text-xs border rounded"
              />
            </div>
          </div>
        )}

        <div
          ref={timelineRef}
          className="relative max-h-96 overflow-y-auto scrollbar-thin space-y-6 mt-4 p-1"
        >
          {/* Timeline line - connects events */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border z-0"></div>

          {viewMode === 'list' ? (
            // List View
            Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date} className="space-y-3 relative z-10">
                <div className="sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-20">
                  <div className="text-sm font-medium text-muted-foreground pl-8">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`relative flex gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors ml-2 ${
                      selectedEventId === event.id
                        ? 'bg-muted ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={() => onEventSelect?.(event)}
                  >
                    <div
                      className={`relative z-10 w-4 h-4 rounded-full border-2 bg-background mt-1 flex-shrink-0 ${getEventColor(event.type)}`}
                    >
                       {event.type === 'alert_triggered' && (
                        <Zap className="absolute -top-1 -left-1 h-5 w-5 text-red-500 animate-pulse bg-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {getEventIcon(event.type)}
                        </span>
                        <div className="font-medium text-sm truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                          {formatRelativeTime(event.timestamp)}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {event.type.replace('_', ' ')}
                        </Badge>

                        {event.entityId && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            ID: {event.entityId.slice(0, 8)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            // Narrative View
            <div className="space-y-8 pl-2 relative z-10">
              {narrativeEvents.length > 0 ? (
                narrativeEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "relative p-4 border rounded-lg bg-card shadow-sm transition-all hover:shadow-md cursor-pointer ml-6",
                      selectedEventId === event.id ? "ring-2 ring-primary border-primary" : "border-border"
                    )}
                    onClick={() => onEventSelect?.(event)}
                  >
                     {/* Connector dot on the main timeline line */}
                    <div className={cn(
                        "absolute -left-[33px] top-6 w-5 h-5 rounded-full border-4 bg-background z-10",
                        getEventColor(event.type)
                      )}
                    />

                    {/* Horizontal line from main timeline to card */}
                    <div className="absolute -left-[24px] top-[22px] w-6 h-0.5 bg-border"></div>

                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm flex items-center gap-2">
                         {getEventIcon(event.type)} {event.title}
                      </div>
                      <Badge variant={event.type === 'threat_detected' ? 'destructive' : 'outline'}>
                        {formatRelativeTime(event.timestamp)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {event.description || "No description available."}
                    </p>

                    {event.data && (
                      <div className="bg-muted p-2 rounded text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                        {JSON.stringify(event.data).slice(0, 100)}
                        {JSON.stringify(event.data).length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                 <div className="text-center py-8 text-muted-foreground ml-6">
                  <p className="text-sm">No major narrative events found.</p>
                  <p className="text-xs mt-1">Try switching to List view to see all events.</p>
                </div>
              )}
            </div>
          )}

          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No timeline events found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
