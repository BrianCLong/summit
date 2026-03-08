"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionAnalyzer = void 0;
/**
 * Session analytics for user behavior tracking
 */
class SessionAnalyzer {
    sessions = new Map();
    sessionTimeout = 1800000; // 30 minutes
    constructor(sessionTimeout) {
        if (sessionTimeout) {
            this.sessionTimeout = sessionTimeout;
        }
        // Cleanup expired sessions
        setInterval(() => this.cleanupSessions(), 60000);
    }
    /**
     * Track event in session
     */
    trackEvent(sessionId, event) {
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
    getSessionStats(session) {
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
    cleanupSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivity > this.sessionTimeout) {
                this.sessions.delete(id);
            }
        }
    }
}
exports.SessionAnalyzer = SessionAnalyzer;
