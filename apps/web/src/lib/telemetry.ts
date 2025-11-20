/**
 * Telemetry & Time-to-Task Measurement
 *
 * Tracks user interactions and measures task completion times
 * to validate UI/UX improvements and time-to-task reduction.
 */

export interface TelemetryEvent {
  type: string
  timestamp: number
  duration?: number
  metadata?: Record<string, any>
}

export interface TaskMetrics {
  taskId: string
  taskType: string
  startTime: number
  endTime?: number
  duration?: number
  steps: TelemetryEvent[]
  success: boolean
  metadata?: Record<string, any>
}

class TelemetryService {
  private events: TelemetryEvent[] = []
  private activeTasks: Map<string, TaskMetrics> = new Map()
  private sessionStartTime: number = Date.now()
  private enabled: boolean = true

  constructor() {
    // Check if telemetry is enabled (can be controlled via env var or user preference)
    this.enabled = process.env.REACT_APP_TELEMETRY_ENABLED !== 'false'

    if (this.enabled) {
      this.initializeSession()
    }
  }

  private initializeSession() {
    // Track session start
    this.trackEvent({
      type: 'session_start',
      timestamp: this.sessionStartTime,
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    })

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent({
        type: 'session_end',
        timestamp: Date.now(),
        duration: Date.now() - this.sessionStartTime,
      })
      this.flush()
    })

    // Flush events periodically
    setInterval(() => this.flush(), 30000) // Every 30 seconds
  }

  /**
   * Track a telemetry event
   */
  trackEvent(event: Omit<TelemetryEvent, 'timestamp'> & { timestamp?: number }) {
    if (!this.enabled) return

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    }

    this.events.push(telemetryEvent)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', telemetryEvent)
    }
  }

  /**
   * Start tracking a task
   */
  startTask(taskId: string, taskType: string, metadata?: Record<string, any>) {
    if (!this.enabled) return

    const task: TaskMetrics = {
      taskId,
      taskType,
      startTime: Date.now(),
      steps: [],
      success: false,
      metadata,
    }

    this.activeTasks.set(taskId, task)

    this.trackEvent({
      type: 'task_start',
      metadata: {
        taskId,
        taskType,
        ...metadata,
      },
    })
  }

  /**
   * Track a step within a task
   */
  trackTaskStep(taskId: string, stepType: string, metadata?: Record<string, any>) {
    if (!this.enabled) return

    const task = this.activeTasks.get(taskId)
    if (!task) return

    const step: TelemetryEvent = {
      type: stepType,
      timestamp: Date.now(),
      metadata,
    }

    task.steps.push(step)
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, success: boolean = true, metadata?: Record<string, any>) {
    if (!this.enabled) return

    const task = this.activeTasks.get(taskId)
    if (!task) return

    task.endTime = Date.now()
    task.duration = task.endTime - task.startTime
    task.success = success

    if (metadata) {
      task.metadata = { ...task.metadata, ...metadata }
    }

    this.trackEvent({
      type: 'task_complete',
      duration: task.duration,
      metadata: {
        taskId,
        taskType: task.taskType,
        success,
        stepCount: task.steps.length,
        ...metadata,
      },
    })

    this.activeTasks.delete(taskId)
  }

  /**
   * Track pane interaction
   */
  trackPaneInteraction(
    paneId: 'graph' | 'timeline' | 'map',
    action: string,
    metadata?: Record<string, any>
  ) {
    this.trackEvent({
      type: 'pane_interaction',
      metadata: {
        paneId,
        action,
        ...metadata,
      },
    })
  }

  /**
   * Track synchronized brushing event
   */
  trackBrushing(
    sourcePaneId: string,
    affectedPanes: string[],
    selectionCount: number,
    metadata?: Record<string, any>
  ) {
    this.trackEvent({
      type: 'synchronized_brushing',
      metadata: {
        sourcePaneId,
        affectedPanes,
        selectionCount,
        ...metadata,
      },
    })
  }

  /**
   * Track command palette usage
   */
  trackCommandPalette(command: string, metadata?: Record<string, any>) {
    this.trackEvent({
      type: 'command_palette',
      metadata: {
        command,
        ...metadata,
      },
    })
  }

  /**
   * Track accessibility feature usage
   */
  trackAccessibility(feature: string, metadata?: Record<string, any>) {
    this.trackEvent({
      type: 'accessibility',
      metadata: {
        feature,
        ...metadata,
      },
    })
  }

  /**
   * Track URL state sharing
   */
  trackURLShare(method: 'copy' | 'open', metadata?: Record<string, any>) {
    this.trackEvent({
      type: 'url_share',
      metadata: {
        method,
        ...metadata,
      },
    })
  }

  /**
   * Get task metrics summary
   */
  getTaskMetrics(): {
    totalTasks: number
    successRate: number
    avgDuration: number
    tasksByType: Record<string, number>
  } {
    const completedTasks = this.events.filter(e => e.type === 'task_complete')

    const totalTasks = completedTasks.length
    const successfulTasks = completedTasks.filter(
      e => e.metadata?.success === true
    ).length
    const successRate = totalTasks > 0 ? successfulTasks / totalTasks : 0

    const durations = completedTasks
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!)
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0

    const tasksByType: Record<string, number> = {}
    completedTasks.forEach(e => {
      const taskType = e.metadata?.taskType || 'unknown'
      tasksByType[taskType] = (tasksByType[taskType] || 0) + 1
    })

    return {
      totalTasks,
      successRate,
      avgDuration,
      tasksByType,
    }
  }

  /**
   * Get all events
   */
  getEvents(): TelemetryEvent[] {
    return [...this.events]
  }

  /**
   * Flush events to backend/analytics service
   */
  private async flush() {
    if (this.events.length === 0) return

    // In production, send to analytics backend
    if (process.env.NODE_ENV === 'production') {
      try {
        // TODO: Send to analytics service
        // await fetch('/api/telemetry', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(this.events),
        // })

        console.log('[Telemetry] Flushed', this.events.length, 'events')
      } catch (error) {
        console.error('[Telemetry] Failed to flush events:', error)
      }
    }

    // Clear events after flushing
    this.events = []
  }

  /**
   * Export telemetry data (for analysis/debugging)
   */
  export(): {
    events: TelemetryEvent[]
    metrics: ReturnType<typeof this.getTaskMetrics>
    sessionDuration: number
  } {
    return {
      events: this.getEvents(),
      metrics: this.getTaskMetrics(),
      sessionDuration: Date.now() - this.sessionStartTime,
    }
  }

  /**
   * Clear all telemetry data
   */
  clear() {
    this.events = []
    this.activeTasks.clear()
  }

  /**
   * Disable telemetry
   */
  disable() {
    this.enabled = false
    this.clear()
  }

  /**
   * Enable telemetry
   */
  enable() {
    this.enabled = true
  }
}

// Export singleton instance
export const telemetry = new TelemetryService()

// Export convenience hooks
export function useTelemetry() {
  return {
    trackEvent: telemetry.trackEvent.bind(telemetry),
    startTask: telemetry.startTask.bind(telemetry),
    trackTaskStep: telemetry.trackTaskStep.bind(telemetry),
    completeTask: telemetry.completeTask.bind(telemetry),
    trackPaneInteraction: telemetry.trackPaneInteraction.bind(telemetry),
    trackBrushing: telemetry.trackBrushing.bind(telemetry),
    trackCommandPalette: telemetry.trackCommandPalette.bind(telemetry),
    trackAccessibility: telemetry.trackAccessibility.bind(telemetry),
    trackURLShare: telemetry.trackURLShare.bind(telemetry),
    getMetrics: telemetry.getTaskMetrics.bind(telemetry),
  }
}

// Common task types
export const TASK_TYPES = {
  INVESTIGATE_ENTITY: 'investigate_entity',
  EXPLORE_RELATIONSHIPS: 'explore_relationships',
  ANALYZE_TIMELINE: 'analyze_timeline',
  GEOSPATIAL_ANALYSIS: 'geospatial_analysis',
  FILTER_DATA: 'filter_data',
  EXPORT_RESULTS: 'export_results',
  CREATE_REPORT: 'create_report',
} as const
