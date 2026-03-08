"use strict";
// Conductor War Room Coordination
// Real-time incident command center with collaborative response coordination
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warRoomCoordinator = exports.WarRoomCoordinator = void 0;
const events_1 = require("events");
const ws_1 = require("ws");
const ioredis_1 = __importDefault(require("ioredis"));
class WarRoomCoordinator extends events_1.EventEmitter {
    sessions = new Map();
    connections = new Map();
    redis;
    wss;
    constructor(redis, port = 8083) {
        super();
        this.redis = redis;
        this.wss = new ws_1.WebSocketServer({ port });
        this.setupWebSocketServer();
        this.setupRedisSubscriptions();
    }
    /**
     * Create new war room session for incident
     */
    async createWarRoom(incidentId, commander, incident) {
        const sessionId = `war_${incidentId}_${Date.now()}`;
        const session = {
            id: sessionId,
            incidentId,
            status: 'active',
            commander,
            participants: [
                {
                    userId: commander,
                    name: commander,
                    role: 'commander',
                    joinedAt: Date.now(),
                    lastSeen: Date.now(),
                    status: 'online',
                    permissions: [
                        'read_timeline',
                        'write_timeline',
                        'upload_artifacts',
                        'make_decisions',
                        'assign_actions',
                        'escalate_incident',
                        'resolve_incident',
                        'manage_participants',
                    ],
                },
            ],
            timeline: [
                {
                    id: `event_${Date.now()}`,
                    type: 'system',
                    timestamp: Date.now(),
                    content: `War room created for incident: ${incident.title}`,
                    critical: true,
                },
            ],
            createdAt: Date.now(),
            artifacts: [],
            decisions: [],
            actionItems: [],
        };
        this.sessions.set(sessionId, session);
        this.connections.set(sessionId, new Set());
        // Persist session
        await this.persistSession(session);
        // Auto-invite key personnel based on incident type
        await this.autoInvitePersonnel(session, incident);
        this.emit('war_room:created', session);
        return sessionId;
    }
    /**
     * Join war room session
     */
    async joinWarRoom(sessionId, userId, role = 'responder') {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return false;
        }
        // Check if user already joined
        let participant = session.participants.find((p) => p.userId === userId);
        if (participant) {
            participant.status = 'online';
            participant.lastSeen = Date.now();
        }
        else {
            // Add new participant
            participant = {
                userId,
                name: userId, // Would typically resolve to actual name
                role,
                joinedAt: Date.now(),
                lastSeen: Date.now(),
                status: 'online',
                permissions: this.getDefaultPermissions(role),
            };
            session.participants.push(participant);
        }
        // Add timeline event
        this.addTimelineEvent(session, {
            type: 'system',
            content: `${userId} joined the war room as ${role}`,
            userId,
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'join',
            sessionId,
            data: { participant },
            timestamp: Date.now(),
        });
        return true;
    }
    /**
     * Send message to war room
     */
    async sendMessage(sessionId, userId, content, critical = false) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const participant = session.participants.find((p) => p.userId === userId);
        if (!participant || !participant.permissions.includes('write_timeline')) {
            return;
        }
        this.addTimelineEvent(session, {
            type: 'message',
            content,
            userId,
            critical,
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'message',
            sessionId,
            data: { content, critical, userId },
            timestamp: Date.now(),
        });
    }
    /**
     * Make decision in war room
     */
    async makeDecision(sessionId, userId, decision) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        const participant = session.participants.find((p) => p.userId === userId);
        if (!participant || !participant.permissions.includes('make_decisions')) {
            throw new Error('Permission denied');
        }
        const decisionId = `decision_${Date.now()}`;
        const warRoomDecision = {
            id: decisionId,
            ...decision,
            decidedBy: userId,
            decidedAt: Date.now(),
            status: 'pending',
            approved: participant.role === 'commander' || decision.impact === 'low',
        };
        session.decisions.push(warRoomDecision);
        this.addTimelineEvent(session, {
            type: 'decision',
            content: `Decision made: ${decision.title}`,
            userId,
            critical: decision.impact === 'critical',
            metadata: { decisionId, impact: decision.impact },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'decision_made',
            sessionId,
            data: warRoomDecision,
            timestamp: Date.now(),
        });
        return decisionId;
    }
    /**
     * Assign action item
     */
    async assignAction(sessionId, assignerUserId, action) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        const participant = session.participants.find((p) => p.userId === assignerUserId);
        if (!participant || !participant.permissions.includes('assign_actions')) {
            throw new Error('Permission denied');
        }
        const actionId = `action_${Date.now()}`;
        const actionItem = {
            id: actionId,
            ...action,
            status: 'open',
            createdAt: Date.now(),
        };
        session.actionItems.push(actionItem);
        this.addTimelineEvent(session, {
            type: 'action',
            content: `Action assigned: ${action.title} → ${action.assignedTo}`,
            userId: assignerUserId,
            critical: action.priority === 'urgent',
            metadata: { actionId, assignedTo: action.assignedTo },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'action_assigned',
            sessionId,
            data: actionItem,
            timestamp: Date.now(),
        });
        return actionId;
    }
    /**
     * Upload artifact to war room
     */
    async uploadArtifact(sessionId, userId, artifact) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        const participant = session.participants.find((p) => p.userId === userId);
        if (!participant || !participant.permissions.includes('upload_artifacts')) {
            throw new Error('Permission denied');
        }
        const artifactId = `artifact_${Date.now()}`;
        const warRoomArtifact = {
            id: artifactId,
            ...artifact,
            uploadedBy: userId,
            uploadedAt: Date.now(),
        };
        session.artifacts.push(warRoomArtifact);
        this.addTimelineEvent(session, {
            type: 'system',
            content: `Artifact uploaded: ${artifact.name} (${artifact.type})`,
            userId,
            metadata: { artifactId, artifactType: artifact.type },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'artifact_upload',
            sessionId,
            data: warRoomArtifact,
            timestamp: Date.now(),
        });
        return artifactId;
    }
    /**
     * Report runbook execution to war room
     */
    async reportRunbookExecution(sessionId, execution) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        this.addTimelineEvent(session, {
            type: 'system',
            content: `Runbook executed: ${execution.runbookId} (${execution.status})`,
            critical: execution.status === 'failed',
            metadata: {
                executionId: execution.id,
                runbookId: execution.runbookId,
                status: execution.status,
            },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'runbook_executed',
            sessionId,
            data: execution,
            timestamp: Date.now(),
        });
    }
    /**
     * Escalate incident from war room
     */
    async escalateIncident(sessionId, userId, escalationReason, escalationLevel) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        const participant = session.participants.find((p) => p.userId === userId);
        if (!participant ||
            !participant.permissions.includes('escalate_incident')) {
            throw new Error('Permission denied');
        }
        this.addTimelineEvent(session, {
            type: 'escalation',
            content: `Incident escalated to ${escalationLevel}: ${escalationReason}`,
            userId,
            critical: true,
            metadata: { escalationLevel, reason: escalationReason },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'escalation',
            sessionId,
            data: { escalationLevel, reason: escalationReason },
            timestamp: Date.now(),
        });
        this.emit('war_room:escalated', {
            session,
            escalationLevel,
            reason: escalationReason,
        });
    }
    /**
     * Resolve war room session
     */
    async resolveWarRoom(sessionId, commanderId, resolution) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        if (session.commander !== commanderId) {
            throw new Error('Only commander can resolve war room');
        }
        session.status = 'resolved';
        session.resolvedAt = Date.now();
        this.addTimelineEvent(session, {
            type: 'system',
            content: `War room resolved: ${resolution.summary}`,
            userId: commanderId,
            critical: true,
            metadata: { resolution },
        });
        await this.persistSession(session);
        this.broadcastToSession(sessionId, {
            type: 'status_update',
            sessionId,
            data: { status: 'resolved', resolution },
            timestamp: Date.now(),
        });
        // Auto-generate post-incident report
        await this.generatePostIncidentReport(session, resolution);
        this.emit('war_room:resolved', session);
    }
    /**
     * Get war room session
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * List active war rooms
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const url = new URL(req.url, 'http://localhost');
            const sessionId = url.searchParams.get('session');
            const userId = url.searchParams.get('user');
            if (!sessionId || !userId) {
                ws.close(1008, 'Missing session or user ID');
                return;
            }
            // Add connection to session
            if (!this.connections.has(sessionId)) {
                this.connections.set(sessionId, new Set());
            }
            this.connections.get(sessionId).add(ws);
            // Handle disconnect
            ws.on('close', () => {
                this.connections.get(sessionId)?.delete(ws);
                this.updateParticipantStatus(sessionId, userId, 'offline');
            });
            // Handle messages
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleWebSocketMessage(sessionId, userId, message, ws);
                }
                catch (error) {
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });
            // Join war room
            this.joinWarRoom(sessionId, userId);
        });
    }
    setupRedisSubscriptions() {
        const subscriber = this.redis.duplicate();
        subscriber.subscribe('war_room:*', (err) => {
            if (err) {
                console.error('Redis subscription error:', err);
            }
        });
        subscriber.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                const sessionId = channel.split(':')[1];
                this.broadcastToSession(sessionId, data);
            }
            catch (error) {
                console.error('Redis message processing error:', error);
            }
        });
    }
    async handleWebSocketMessage(sessionId, userId, message, ws) {
        switch (message.type) {
            case 'send_message':
                await this.sendMessage(sessionId, userId, message.content, message.critical);
                break;
            case 'make_decision':
                const decisionId = await this.makeDecision(sessionId, userId, message.decision);
                ws.send(JSON.stringify({ type: 'decision_created', decisionId }));
                break;
            case 'assign_action':
                const actionId = await this.assignAction(sessionId, userId, message.action);
                ws.send(JSON.stringify({ type: 'action_created', actionId }));
                break;
            case 'update_status':
                await this.updateParticipantStatus(sessionId, userId, message.status);
                break;
        }
    }
    broadcastToSession(sessionId, message) {
        const connections = this.connections.get(sessionId);
        if (!connections)
            return;
        const messageStr = JSON.stringify(message);
        connections.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
    }
    addTimelineEvent(session, event) {
        session.timeline.push({
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...event,
        });
    }
    getDefaultPermissions(role) {
        switch (role) {
            case 'commander':
                return [
                    'read_timeline',
                    'write_timeline',
                    'upload_artifacts',
                    'make_decisions',
                    'assign_actions',
                    'escalate_incident',
                    'resolve_incident',
                    'manage_participants',
                ];
            case 'responder':
                return [
                    'read_timeline',
                    'write_timeline',
                    'upload_artifacts',
                    'assign_actions',
                ];
            case 'sme':
                return [
                    'read_timeline',
                    'write_timeline',
                    'upload_artifacts',
                    'make_decisions',
                ];
            case 'observer':
                return ['read_timeline'];
            default:
                return ['read_timeline'];
        }
    }
    async autoInvitePersonnel(session, incident) {
        // Auto-invite based on incident type and severity
        const invites = [];
        if (incident.type === 'security') {
            invites.push({ userId: 'security-lead', role: 'responder' }, { userId: 'ciso', role: 'sme' });
        }
        if (incident.severity === 'P0') {
            invites.push({ userId: 'engineering-director', role: 'sme' }, { userId: 'product-manager', role: 'observer' });
        }
        for (const invite of invites) {
            await this.joinWarRoom(session.id, invite.userId, invite.role);
        }
    }
    async updateParticipantStatus(sessionId, userId, status) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const participant = session.participants.find((p) => p.userId === userId);
        if (participant) {
            participant.status = status;
            participant.lastSeen = Date.now();
            await this.persistSession(session);
        }
    }
    async persistSession(session) {
        await this.redis.setex(`war_room:${session.id}`, 86400 * 7, // 7 days
        JSON.stringify(session));
    }
    async generatePostIncidentReport(session, resolution) {
        const report = {
            incidentId: session.incidentId,
            warRoomId: session.id,
            duration: session.resolvedAt - session.createdAt,
            participants: session.participants.length,
            decisions: session.decisions.length,
            actionItems: session.actionItems.length,
            artifacts: session.artifacts.length,
            timeline: session.timeline.length,
            resolution,
        };
        // Store report
        await this.redis.setex(`post_incident_report:${session.incidentId}`, 86400 * 30, // 30 days
        JSON.stringify(report));
    }
}
exports.WarRoomCoordinator = WarRoomCoordinator;
// Singleton instance
exports.warRoomCoordinator = new WarRoomCoordinator(new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379'));
