"use strict";
/**
 * Break-Glass Emergency Access Controller
 *
 * Provides time-limited emergency access that bypasses normal zero-trust policies
 * while maintaining full audit trail and requiring strong authentication.
 *
 * Features:
 * - Multi-factor authentication (MFA + hardware key)
 * - Dual-control approval for high-risk access
 * - Time-limited tokens with automatic expiration
 * - Full audit logging with video recording option
 * - Integration with incident management systems
 * - Post-incident review automation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakGlassError = exports.BreakGlassController = void 0;
exports.createBreakGlassMiddleware = createBreakGlassMiddleware;
exports.generateBreakGlassOpaInput = generateBreakGlassOpaInput;
exports.generateBreakGlassRBAC = generateBreakGlassRBAC;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
const zod_1 = require("zod");
// ============================================================================
// TYPES AND SCHEMAS
// ============================================================================
const BreakGlassRequestSchema = zod_1.z.object({
    requesterId: zod_1.z.string().uuid(),
    requesterEmail: zod_1.z.string().email(),
    targetResource: zod_1.z.string(),
    accessLevel: zod_1.z.enum(['read', 'write', 'admin', 'full']),
    justification: zod_1.z.string().min(50).max(2000),
    incidentTicket: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().min(5).max(480).default(60),
    requireDualControl: zod_1.z.boolean().default(false),
    mfaToken: zod_1.z.string(),
    hardwareKeySignature: zod_1.z.string().optional(),
});
const BreakGlassApprovalSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    approverId: zod_1.z.string().uuid(),
    approverEmail: zod_1.z.string().email(),
    approved: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
    mfaToken: zod_1.z.string(),
});
// ============================================================================
// BREAK-GLASS CONTROLLER
// ============================================================================
class BreakGlassController extends events_1.EventEmitter {
    sessions = new Map();
    config;
    cleanupInterval;
    constructor(config = {}) {
        super();
        this.config = {
            maxDurationMinutes: config.maxDurationMinutes ?? 480,
            requireDualControlForAdmin: config.requireDualControlForAdmin ?? true,
            requireHardwareKey: config.requireHardwareKey ?? true,
            allowedApprovers: config.allowedApprovers ?? [],
            notificationWebhook: config.notificationWebhook,
            slackChannel: config.slackChannel,
            pagerDutyServiceId: config.pagerDutyServiceId,
            auditLogEndpoint: config.auditLogEndpoint,
            videoRecordingEnabled: config.videoRecordingEnabled ?? false,
        };
        // Start cleanup job for expired sessions
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000);
    }
    /**
     * Initiate a break-glass access request
     */
    async initiateBreakGlass(request, context) {
        // Validate request
        const validated = BreakGlassRequestSchema.parse(request);
        // Verify MFA token
        const mfaValid = await this.verifyMFA(validated.requesterId, validated.mfaToken);
        if (!mfaValid) {
            throw new BreakGlassError('MFA verification failed', 'MFA_FAILED');
        }
        // Verify hardware key if required
        if (this.config.requireHardwareKey) {
            if (!validated.hardwareKeySignature) {
                throw new BreakGlassError('Hardware key signature required', 'HARDWARE_KEY_REQUIRED');
            }
            const keyValid = await this.verifyHardwareKey(validated.requesterId, validated.hardwareKeySignature);
            if (!keyValid) {
                throw new BreakGlassError('Hardware key verification failed', 'HARDWARE_KEY_FAILED');
            }
        }
        // Check if dual control is required
        const requiresDualControl = validated.requireDualControl ||
            (this.config.requireDualControlForAdmin && validated.accessLevel === 'admin') ||
            validated.accessLevel === 'full';
        // Generate session
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + validated.durationMinutes * 60 * 1000);
        const session = {
            id: sessionId,
            requesterId: validated.requesterId,
            requesterEmail: validated.requesterEmail,
            targetResource: validated.targetResource,
            accessLevel: validated.accessLevel,
            justification: validated.justification,
            incidentTicket: validated.incidentTicket,
            status: requiresDualControl ? 'pending_approval' : 'active',
            createdAt: now,
            expiresAt,
            approvals: [],
            auditLog: [
                {
                    timestamp: now,
                    action: 'BREAK_GLASS_INITIATED',
                    actor: validated.requesterEmail,
                    details: {
                        targetResource: validated.targetResource,
                        accessLevel: validated.accessLevel,
                        justification: validated.justification,
                        incidentTicket: validated.incidentTicket,
                        durationMinutes: validated.durationMinutes,
                        requiresDualControl,
                    },
                    sourceIp: context.sourceIp,
                    userAgent: context.userAgent,
                },
            ],
        };
        // If not requiring approval, generate token immediately
        if (!requiresDualControl) {
            const { token, hash } = this.generateAccessToken(session);
            session.accessToken = token;
            session.tokenHash = hash;
            session.activatedAt = now;
        }
        this.sessions.set(sessionId, session);
        // Send notifications
        await this.sendNotifications(session, 'initiated');
        // Emit event
        this.emit('break-glass-initiated', {
            sessionId,
            requester: validated.requesterEmail,
            resource: validated.targetResource,
            accessLevel: validated.accessLevel,
        });
        // Log to external audit system
        await this.logToAuditSystem(session.auditLog[0]);
        return {
            sessionId,
            requiresApproval: requiresDualControl,
            expiresAt,
        };
    }
    /**
     * Approve or deny a break-glass request
     */
    async processApproval(approval, context) {
        const validated = BreakGlassApprovalSchema.parse(approval);
        const session = this.sessions.get(validated.sessionId);
        if (!session) {
            throw new BreakGlassError('Session not found', 'SESSION_NOT_FOUND');
        }
        if (session.status !== 'pending_approval') {
            throw new BreakGlassError(`Session is ${session.status}, cannot process approval`, 'INVALID_SESSION_STATE');
        }
        // Verify approver is authorized
        if (!this.config.allowedApprovers.includes(validated.approverEmail)) {
            throw new BreakGlassError('Approver not authorized', 'UNAUTHORIZED_APPROVER');
        }
        // Verify approver is not the requester
        if (validated.approverId === session.requesterId) {
            throw new BreakGlassError('Cannot approve own request', 'SELF_APPROVAL_FORBIDDEN');
        }
        // Verify MFA
        const mfaValid = await this.verifyMFA(validated.approverId, validated.mfaToken);
        if (!mfaValid) {
            throw new BreakGlassError('MFA verification failed', 'MFA_FAILED');
        }
        // Record approval
        const now = new Date();
        session.approvals.push({
            approverId: validated.approverId,
            approverEmail: validated.approverEmail,
            approved: validated.approved,
            reason: validated.reason,
            timestamp: now,
        });
        session.auditLog.push({
            timestamp: now,
            action: validated.approved ? 'BREAK_GLASS_APPROVED' : 'BREAK_GLASS_DENIED',
            actor: validated.approverEmail,
            details: {
                approved: validated.approved,
                reason: validated.reason,
            },
            sourceIp: context.sourceIp,
            userAgent: context.userAgent,
        });
        if (validated.approved) {
            // Activate session
            session.status = 'active';
            session.activatedAt = now;
            const { token, hash } = this.generateAccessToken(session);
            session.accessToken = token;
            session.tokenHash = hash;
            await this.sendNotifications(session, 'approved');
            this.emit('break-glass-approved', { sessionId: session.id });
            await this.logToAuditSystem(session.auditLog[session.auditLog.length - 1]);
            return { approved: true, accessToken: token };
        }
        else {
            session.status = 'revoked';
            session.revokedAt = now;
            session.revokedBy = validated.approverEmail;
            session.revokeReason = validated.reason;
            await this.sendNotifications(session, 'denied');
            this.emit('break-glass-denied', { sessionId: session.id });
            await this.logToAuditSystem(session.auditLog[session.auditLog.length - 1]);
            return { approved: false };
        }
    }
    /**
     * Validate a break-glass access token
     */
    validateToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        for (const session of this.sessions.values()) {
            if (session.tokenHash === tokenHash) {
                if (session.status !== 'active') {
                    return { valid: false };
                }
                const now = new Date();
                if (now > session.expiresAt) {
                    session.status = 'expired';
                    return { valid: false };
                }
                const remainingSeconds = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);
                return { valid: true, session, remainingSeconds };
            }
        }
        return { valid: false };
    }
    /**
     * Revoke an active break-glass session
     */
    async revokeSession(sessionId, revokedBy, reason, context) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new BreakGlassError('Session not found', 'SESSION_NOT_FOUND');
        }
        if (session.status !== 'active' && session.status !== 'pending_approval') {
            throw new BreakGlassError('Session cannot be revoked', 'INVALID_SESSION_STATE');
        }
        const now = new Date();
        session.status = 'revoked';
        session.revokedAt = now;
        session.revokedBy = revokedBy;
        session.revokeReason = reason;
        session.accessToken = undefined;
        session.auditLog.push({
            timestamp: now,
            action: 'BREAK_GLASS_REVOKED',
            actor: revokedBy,
            details: { reason },
            sourceIp: context.sourceIp,
            userAgent: context.userAgent,
        });
        await this.sendNotifications(session, 'revoked');
        this.emit('break-glass-revoked', { sessionId });
        await this.logToAuditSystem(session.auditLog[session.auditLog.length - 1]);
    }
    /**
     * Log an action performed during a break-glass session
     */
    async logAction(sessionId, action, details, context) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new BreakGlassError('Session not found', 'SESSION_NOT_FOUND');
        }
        const entry = {
            timestamp: new Date(),
            action: `BREAK_GLASS_ACTION: ${action}`,
            actor: session.requesterEmail,
            details,
            sourceIp: context.sourceIp,
            userAgent: context.userAgent,
        };
        session.auditLog.push(entry);
        await this.logToAuditSystem(entry);
    }
    /**
     * Get session details for review
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all active sessions (for monitoring)
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
    }
    /**
     * Get sessions requiring review (expired or used)
     */
    getSessionsForReview() {
        return Array.from(this.sessions.values()).filter((s) => s.status === 'expired' || s.status === 'used');
    }
    /**
     * Generate compliance report for break-glass usage
     */
    generateComplianceReport(startDate, endDate) {
        const sessions = Array.from(this.sessions.values()).filter((s) => s.createdAt >= startDate && s.createdAt <= endDate);
        const byStatus = {};
        const byAccessLevel = {};
        const requesters = new Set();
        let totalDuration = 0;
        for (const session of sessions) {
            byStatus[session.status] = (byStatus[session.status] || 0) + 1;
            byAccessLevel[session.accessLevel] = (byAccessLevel[session.accessLevel] || 0) + 1;
            requesters.add(session.requesterEmail);
            if (session.activatedAt) {
                const endTime = session.revokedAt || session.expiresAt;
                totalDuration += (endTime.getTime() - session.activatedAt.getTime()) / 60000;
            }
        }
        return {
            totalSessions: sessions.length,
            byStatus,
            byAccessLevel,
            averageDurationMinutes: sessions.length > 0 ? totalDuration / sessions.length : 0,
            uniqueRequesters: requesters.size,
            sessions: sessions.map((s) => ({
                id: s.id,
                requester: s.requesterEmail,
                resource: s.targetResource,
                status: s.status,
                duration: s.activatedAt
                    ? ((s.revokedAt || s.expiresAt).getTime() - s.activatedAt.getTime()) / 60000
                    : 0,
            })),
        };
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    async verifyMFA(userId, token) {
        // Integration with MFA provider (TOTP, push notification, etc.)
        // In production, this would call out to your identity provider
        console.log(`Verifying MFA for user ${userId}`);
        return token.length >= 6; // Simplified for example
    }
    async verifyHardwareKey(userId, signature) {
        // Integration with FIDO2/WebAuthn
        console.log(`Verifying hardware key for user ${userId}`);
        return signature.length > 0; // Simplified for example
    }
    generateAccessToken(session) {
        const token = crypto.randomBytes(48).toString('base64url');
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        return { token, hash };
    }
    async sendNotifications(session, event) {
        const message = this.formatNotificationMessage(session, event);
        // Slack notification
        if (this.config.slackChannel) {
            await this.sendSlackNotification(message);
        }
        // PagerDuty
        if (this.config.pagerDutyServiceId && event === 'initiated') {
            await this.sendPagerDutyAlert(session);
        }
        // Webhook
        if (this.config.notificationWebhook) {
            await this.sendWebhookNotification(session, event);
        }
    }
    formatNotificationMessage(session, event) {
        const emoji = {
            initiated: '🚨',
            approved: '✅',
            denied: '❌',
            revoked: '🛑',
            expired: '⏰',
        }[event] || '📢';
        return `${emoji} *Break-Glass ${event.toUpperCase()}*
• Requester: ${session.requesterEmail}
• Resource: ${session.targetResource}
• Access Level: ${session.accessLevel}
• Justification: ${session.justification}
• Incident Ticket: ${session.incidentTicket || 'N/A'}
• Session ID: ${session.id}
• Expires: ${session.expiresAt.toISOString()}`;
    }
    async sendSlackNotification(message) {
        console.log(`[Slack] ${message}`);
        // In production: await fetch(slackWebhookUrl, { method: 'POST', body: JSON.stringify({ text: message }) });
    }
    async sendPagerDutyAlert(session) {
        console.log(`[PagerDuty] Break-glass initiated for ${session.targetResource}`);
        // In production: call PagerDuty Events API
    }
    async sendWebhookNotification(session, event) {
        console.log(`[Webhook] ${event} - ${session.id}`);
        // In production: await fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ session, event }) });
    }
    async logToAuditSystem(entry) {
        if (this.config.auditLogEndpoint) {
            console.log(`[Audit] ${JSON.stringify(entry)}`);
            // In production: await fetch(auditEndpoint, { method: 'POST', body: JSON.stringify(entry) });
        }
    }
    cleanupExpiredSessions() {
        const now = new Date();
        for (const [id, session] of this.sessions) {
            if (session.status === 'active' && now > session.expiresAt) {
                session.status = 'expired';
                session.auditLog.push({
                    timestamp: now,
                    action: 'BREAK_GLASS_EXPIRED',
                    actor: 'SYSTEM',
                    details: {},
                });
                this.emit('break-glass-expired', { sessionId: id });
                this.sendNotifications(session, 'expired');
            }
        }
    }
    /**
     * Cleanup resources
     */
    destroy() {
        clearInterval(this.cleanupInterval);
    }
}
exports.BreakGlassController = BreakGlassController;
// ============================================================================
// ERROR CLASS
// ============================================================================
class BreakGlassError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'BreakGlassError';
    }
}
exports.BreakGlassError = BreakGlassError;
function createBreakGlassMiddleware(controller) {
    return async (req, res, next) => {
        const authHeader = req.headers['x-break-glass-token'];
        if (!authHeader || typeof authHeader !== 'string') {
            return next();
        }
        const result = controller.validateToken(authHeader);
        if (!result.valid) {
            return res.status(401).json({
                error: 'Invalid or expired break-glass token',
                code: 'BREAK_GLASS_INVALID',
            });
        }
        // Attach session to request
        req.breakGlass = result.session;
        // Log access
        await controller.logAction(result.session.id, `${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            query: req.query,
        }, {
            sourceIp: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
        });
        // Add warning header about remaining time
        res.setHeader('X-Break-Glass-Remaining-Seconds', result.remainingSeconds.toString());
        next();
    };
}
// ============================================================================
// OPA INTEGRATION
// ============================================================================
/**
 * Generate OPA input for break-glass authorization
 */
function generateBreakGlassOpaInput(session) {
    return {
        break_glass: {
            enabled: true,
            session_id: session.id,
            requester: session.requesterEmail,
            access_level: session.accessLevel,
            target_resource: session.targetResource,
            expires_at: session.expiresAt.toISOString(),
            approvals: session.approvals.length,
            incident_ticket: session.incidentTicket,
        },
    };
}
// ============================================================================
// KUBERNETES INTEGRATION
// ============================================================================
/**
 * Generate Kubernetes RBAC for break-glass session
 */
function generateBreakGlassRBAC(session) {
    const roleBinding = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRoleBinding',
        metadata: {
            name: `break-glass-${session.id}`,
            labels: {
                'break-glass.intelgraph.io/session-id': session.id,
                'break-glass.intelgraph.io/expires': session.expiresAt.toISOString(),
            },
            annotations: {
                'break-glass.intelgraph.io/requester': session.requesterEmail,
                'break-glass.intelgraph.io/justification': session.justification,
                'break-glass.intelgraph.io/incident': session.incidentTicket || '',
            },
        },
        roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: `break-glass-${session.accessLevel}`,
        },
        subjects: [
            {
                kind: 'User',
                name: session.requesterEmail,
                apiGroup: 'rbac.authorization.k8s.io',
            },
        ],
    };
    return JSON.stringify(roleBinding, null, 2);
}
