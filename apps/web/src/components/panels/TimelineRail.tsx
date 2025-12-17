import * as React from 'react'
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
  Play,
  Pause,
  RotateCcw,
  FastForward,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRelativeTime } from '@/lib/utils'
import type { TimelineEvent, PanelProps } from '@/types'

interface TimelineRailProps extends PanelProps<TimelineEvent[]> {
  onTimeRangeChange?: (range: { start: string; end: string }) => void
  onEventSelect?: (event: TimelineEvent) => void
  selectedEventId?: string
  autoScroll?: boolean
  // Playback props
  totalTimeRange?: { start: Date; end: Date }
  currentTime?: Date
  onCurrentTimeChange?: (time: Date) => void
}

export function TimelineRail({
  data: events,
  loading = false,
  error,
  onTimeRangeChange,
  onEventSelect,
  selectedEventId,
  autoScroll = true,
  className,
  totalTimeRange,
  currentTime,
  onCurrentTimeChange,
}: TimelineRailProps) {
  const [timeRange, setTimeRange] = React.useState<{
    start: string
    end: string
  }>({
    start: '',
    end: '',
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const timelineRef = React.useRef<HTMLDivElement>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1)

  // Playback loop
  React.useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && totalTimeRange && currentTime && onCurrentTimeChange) {
      interval = setInterval(() => {
        const totalDuration =
          totalTimeRange.end.getTime() - totalTimeRange.start.getTime()

        // Target 60 seconds for full playback at 1x speed
        const standardDurationSeconds = 60
        const tickRateMs = 100
        const timeStepMs =
          (totalDuration / (standardDurationSeconds * (1000 / tickRateMs))) *
          playbackSpeed

        const nextTime = new Date(currentTime.getTime() + timeStepMs)

        if (nextTime >= totalTimeRange.end) {
          onCurrentTimeChange(totalTimeRange.end)
          setIsPlaying(false)
        } else {
          onCurrentTimeChange(nextTime)
        }
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [
    isPlaying,
    totalTimeRange,
    currentTime,
    onCurrentTimeChange,
    playbackSpeed,
  ])

  // Auto-scroll to latest events or active event during playback
  React.useEffect(() => {
    if (!timelineRef.current || events.length === 0) return

    if (isPlaying && currentTime) {
      // Find the last event that is <= currentTime
      const lastActiveEvent = events
        .filter(e => new Date(e.timestamp) <= currentTime)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]

      if (lastActiveEvent) {
        // Find the element in the DOM (we need to give them IDs or refs, but we can't easily ref map)
        // Alternatively, calculate scroll position.
        // Simple hack: We are not rendering IDs on the DOM elements directly accessible.
        // But we have key={event.id}.
        // Let's try to query selector.
        // The container is timelineRef.current
        // We can't easily select by React key.
        // Let's assume the events are rendered in order.
        // The sortedEvents logic is inside Render, but we need it here.
        // This is getting complex for a useEffect.

        // Simpler: Just scroll to bottom if autoScroll is true AND NOT playing.
        // If playing, we might want to stay put or follow.
        // Let's just disable auto-scroll to bottom during playback to prevent jumping.
        // Users can scroll manually.
        return
      }
    }

    if (autoScroll && !isPlaying) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight
    }
  }, [events, autoScroll, isPlaying, currentTime])

  // Toggle playback
  const togglePlayback = () => {
    if (!totalTimeRange || !currentTime) return

    // If at end, restart
    if (currentTime.getTime() >= totalTimeRange.end.getTime()) {
      onCurrentTimeChange?.(totalTimeRange.start)
    }

    setIsPlaying(!isPlaying)
  }

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
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
            <Badge variant="secondary" className="text-xs">
              {events.length} events
            </Badge>
          </div>
          <div className="flex gap-1">
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

      <CardContent className="space-y-4">
        {/* Playback Controls */}
        {totalTimeRange && currentTime && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsPlaying(false)
                    onCurrentTimeChange?.(totalTimeRange.start)
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant={isPlaying ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>

              <div className="flex-1 px-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{totalTimeRange.start.toLocaleDateString()}</span>
                  <span>{currentTime.toLocaleString()}</span>
                  <span>{totalTimeRange.end.toLocaleDateString()}</span>
                </div>
                <Slider
                  value={[currentTime.getTime()]}
                  min={totalTimeRange.start.getTime()}
                  max={totalTimeRange.end.getTime()}
                  step={
                    (totalTimeRange.end.getTime() -
                      totalTimeRange.start.getTime()) /
                    100
                  }
                  onValueChange={vals => {
                    setIsPlaying(false)
                    onCurrentTimeChange?.(new Date(vals[0]))
                  }}
                  className="w-full"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() =>
                  setPlaybackSpeed(s =>
                    s >= 10 ? 1 : s === 1 ? 2 : s === 2 ? 5 : 10
                  )
                }
              >
                {playbackSpeed}x
                <FastForward className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
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
          className="relative max-h-96 overflow-y-auto scrollbar-thin space-y-6"
        >
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} className="space-y-3">
              <div className="sticky top-0 bg-background/90 backdrop-blur-sm py-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {dayEvents.map(event => {
                const isFuture = currentTime
                  ? new Date(event.timestamp) > currentTime
                  : false

                return (
                  <div
                    key={event.id}
                    className={`relative flex gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors ${
                      selectedEventId === event.id
                        ? 'bg-muted ring-2 ring-primary'
                        : ''
                    } ${isFuture ? 'opacity-40 grayscale' : ''}`}
                    onClick={() => onEventSelect?.(event)}
                  >
                  <div
                    className={`relative z-10 w-2 h-2 rounded-full border-2 bg-background mt-2 ${getEventColor(event.type)}`}
                  >
                    {event.type === 'alert_triggered' && (
                      <Zap className="absolute -top-1 -left-1 h-4 w-4 text-red-500 animate-pulse" />
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
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(event.timestamp)}
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>

                      {event.entityId && (
                        <Badge variant="secondary" className="text-xs">
                          Entity: {event.entityId.slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          ))}

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
