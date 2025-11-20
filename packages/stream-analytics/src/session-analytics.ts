/**
 * Session analytics for user behavior tracking
 */
export class SessionAnalyzer {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout: number = 1800000; // 30 minutes

  constructor(sessionTimeout?: number) {
    if (sessionTimeout) {
      this.sessionTimeout = sessionTimeout;
    }

    // Cleanup expired sessions
    setInterval(() => this.cleanupSessions(), 60000);
  }

  /**
   * Track event in session
   */
  trackEvent(sessionId: string, event: SessionEvent): SessionStats {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        startTime: event.timestamp,
        lastActivity: event.timestamp,
        events: [],
        pageViews: 0,
        duration: 0,
      };
      this.sessions.set(sessionId, session);
    }

    // Update session
    session.events.push(event);
    session.lastActivity = event.timestamp;
    session.duration = event.timestamp - session.startTime;

    if (event.type === 'page_view') {
      session.pageViews++;
    }

    return this.getSessionStats(session);
  }

  /**
   * Get session statistics
   */
  private getSessionStats(session: Session): SessionStats {
    return {
      sessionId: session.id,
      duration: session.duration,
      eventCount: session.events.length,
      pageViews: session.pageViews,
      isActive: Date.now() - session.lastActivity < this.sessionTimeout,
    };
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(id);
      }
    }
  }
}

interface Session {
  id: string;
  startTime: number;
  lastActivity: number;
  events: SessionEvent[];
  pageViews: number;
  duration: number;
}

export interface SessionEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface SessionStats {
  sessionId: string;
  duration: number;
  eventCount: number;
  pageViews: number;
  isActive: boolean;
}
