import { EventEmitter } from 'events';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { cacheService } from './cacheService';
export class SecurityService extends EventEmitter {
    constructor() {
        super();
        this.users = new Map();
        this.roles = new Map();
        this.sessions = new Map();
        this.apiKeys = new Map();
        this.securityEvents = [];
        this.auditLogs = [];
        this.maxEventHistory = 10000;
        this.maxAuditHistory = 50000;
        this.jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
        this.saltRounds = 12;
        console.log('[SECURITY] Advanced security service initialized');
        this.initializeRoles();
        this.initializeAdminUser();
        // Cleanup expired sessions and events periodically
        setInterval(() => {
            this.cleanupExpiredSessions();
            this.cleanupOldEvents();
        }, 300000); // Every 5 minutes
    }
    initializeRoles() {
        const roles = [
            {
                id: 'role-admin',
                name: 'ADMIN',
                description: 'Full system administration privileges',
                permissions: [
                    'admin:users',
                    'admin:roles',
                    'admin:permissions',
                    'admin:system',
                    'admin:audit',
                    'manage:investigations',
                    'manage:evidence',
                    'manage:workflows',
                    'manage:security',
                    'read:investigations',
                    'write:investigations',
                    'delete:investigations',
                    'read:entities',
                    'write:entities',
                    'delete:entities',
                    'read:evidence',
                    'write:evidence',
                    'read:analytics',
                    'write:analytics',
                    'read:reports',
                    'write:reports',
                    'export:reports',
                    'collaborate:realtime',
                    'access:ml_features',
                    'access:classified:confidential',
                    'access:classified:secret',
                    'access:classified:top_secret',
                ],
                hierarchyLevel: 10,
                isActive: true,
            },
            {
                id: 'role-security-analyst',
                name: 'SECURITY_ANALYST',
                description: 'Senior security analyst with elevated privileges',
                permissions: [
                    'manage:investigations',
                    'manage:evidence',
                    'manage:workflows',
                    'read:investigations',
                    'write:investigations',
                    'read:entities',
                    'write:entities',
                    'read:evidence',
                    'write:evidence',
                    'read:analytics',
                    'write:analytics',
                    'read:reports',
                    'write:reports',
                    'export:reports',
                    'collaborate:realtime',
                    'access:ml_features',
                    'access:classified:confidential',
                    'access:classified:secret',
                ],
                hierarchyLevel: 8,
                isActive: true,
            },
            {
                id: 'role-senior-analyst',
                name: 'SENIOR_ANALYST',
                description: 'Senior analyst with investigation and collaboration privileges',
                permissions: [
                    'read:investigations',
                    'write:investigations',
                    'read:entities',
                    'write:entities',
                    'read:evidence',
                    'write:evidence',
                    'read:analytics',
                    'write:analytics',
                    'read:reports',
                    'write:reports',
                    'collaborate:realtime',
                    'access:ml_features',
                    'access:classified:confidential',
                ],
                hierarchyLevel: 6,
                isActive: true,
            },
            {
                id: 'role-analyst',
                name: 'ANALYST',
                description: 'Standard analyst with core investigation privileges',
                permissions: [
                    'read:investigations',
                    'write:investigations',
                    'read:entities',
                    'write:entities',
                    'read:evidence',
                    'write:evidence',
                    'read:analytics',
                    'read:reports',
                    'collaborate:realtime',
                    'access:classified:confidential',
                ],
                hierarchyLevel: 4,
                isActive: true,
            },
            {
                id: 'role-viewer',
                name: 'VIEWER',
                description: 'Read-only access to investigations and reports',
                permissions: [
                    'read:investigations',
                    'read:entities',
                    'read:evidence',
                    'read:analytics',
                    'read:reports',
                ],
                hierarchyLevel: 2,
                isActive: true,
            },
        ];
        const now = new Date().toISOString();
        roles.forEach((roleData) => {
            const role = {
                ...roleData,
                createdAt: now,
                updatedAt: now,
            };
            this.roles.set(role.id, role);
        });
        console.log(`[SECURITY] Initialized ${roles.length} security roles`);
    }
    async initializeAdminUser() {
        const adminUser = {
            id: 'user-admin',
            username: 'admin',
            email: 'admin@intelgraph.com',
            fullName: 'System Administrator',
            passwordHash: await bcrypt.hash('admin123', this.saltRounds), // Change in production
            role: 'ADMIN',
            permissions: this.roles.get('role-admin')?.permissions || [],
            department: 'IT Security',
            isActive: true,
            isVerified: true,
            mfaEnabled: false,
            failedLoginAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            securityClearance: 'TOP_SECRET',
            accessContext: {
                ipWhitelist: [],
                timeRestrictions: [],
                deviceRestrictions: {
                    allowedDeviceTypes: ['DESKTOP', 'LAPTOP'],
                    requireTrustedDevice: false,
                    blockUnknownDevices: false,
                },
                locationRestrictions: {
                    allowedCountries: [],
                    blockedCountries: [],
                    allowedRegions: [],
                    blockedRegions: [],
                    requireVPN: false,
                },
                requireMFA: false,
                maxConcurrentSessions: 5,
            },
        };
        this.users.set(adminUser.id, adminUser);
        console.log('[SECURITY] Initialized default admin user');
    }
    /**
     * Authenticate user with username/password
     */
    async authenticate(username, password, ipAddress, userAgent) {
        const user = Array.from(this.users.values()).find((u) => u.username === username);
        if (!user) {
            await this.logSecurityEvent({
                eventType: 'LOGIN_FAILED',
                ipAddress,
                userAgent,
                description: `Login attempt with invalid username: ${username}`,
                riskLevel: 'MEDIUM',
                metadata: { reason: 'invalid_username' },
            });
            return null;
        }
        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            await this.logSecurityEvent({
                eventType: 'LOGIN_FAILED',
                userId: user.id,
                ipAddress,
                userAgent,
                description: 'Login attempt on locked account',
                riskLevel: 'HIGH',
                metadata: { reason: 'account_locked' },
            });
            return null;
        }
        // Verify password
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            user.failedLoginAttempts++;
            // Lock account after 5 failed attempts
            if (user.failedLoginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
                await this.logSecurityEvent({
                    eventType: 'ACCOUNT_LOCKED',
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    description: 'Account locked due to multiple failed login attempts',
                    riskLevel: 'HIGH',
                    metadata: { attempts: user.failedLoginAttempts },
                });
            }
            await this.logSecurityEvent({
                eventType: 'LOGIN_FAILED',
                userId: user.id,
                ipAddress,
                userAgent,
                description: 'Login failed: invalid password',
                riskLevel: 'MEDIUM',
                metadata: { attempts: user.failedLoginAttempts },
            });
            this.users.set(user.id, user);
            return null;
        }
        // Check access context restrictions
        if (!this.validateAccessContext(user, ipAddress, userAgent)) {
            await this.logSecurityEvent({
                eventType: 'PERMISSION_DENIED',
                userId: user.id,
                ipAddress,
                userAgent,
                description: 'Login denied due to access context restrictions',
                riskLevel: 'HIGH',
                metadata: { restrictions: 'access_context' },
            });
            return null;
        }
        // Reset failed attempts on successful login
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        user.lastLogin = new Date().toISOString();
        this.users.set(user.id, user);
        // Create session and tokens
        const session = await this.createSession(user.id, ipAddress, userAgent);
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user, session.id);
        await this.logSecurityEvent({
            eventType: 'LOGIN_SUCCESS',
            userId: user.id,
            sessionId: session.id,
            ipAddress,
            userAgent,
            description: 'Successful user login',
            riskLevel: 'LOW',
            metadata: { role: user.role },
        });
        await this.logAuditEvent({
            userId: user.id,
            sessionId: session.id,
            action: 'LOGIN',
            resource: 'user_session',
            ipAddress,
            userAgent,
            success: true,
            riskScore: this.calculateRiskScore(user, ipAddress, userAgent),
        });
        return { user, accessToken, refreshToken, session };
    }
    /**
     * Validate JWT access token
     */
    async validateAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            const user = this.users.get(decoded.userId);
            const session = this.sessions.get(decoded.sessionId);
            if (!user || !session || !session.isActive || new Date(session.expiresAt) < new Date()) {
                return null;
            }
            // Update last activity
            session.lastActivityAt = new Date().toISOString();
            this.sessions.set(session.id, session);
            return { user, session };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Create new user session
     */
    async createSession(userId, ipAddress, userAgent) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        const session = {
            id: sessionId,
            userId,
            tokenHash: '', // Will be set when tokens are generated
            refreshTokenHash: '',
            ipAddress,
            userAgent,
            isActive: true,
            expiresAt: expiresAt.toISOString(),
            createdAt: now.toISOString(),
            lastActivityAt: now.toISOString(),
            riskScore: this.calculateRiskScore(this.users.get(userId), ipAddress, userAgent),
            deviceFingerprint: this.generateDeviceFingerprint(userAgent),
        };
        this.sessions.set(sessionId, session);
        await cacheService.set(`session:${sessionId}`, session, 86400); // 24 hours cache
        return session;
    }
    /**
     * Generate JWT access token
     */
    generateAccessToken(user) {
        return jwt.sign({
            userId: user.id,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            clearance: user.securityClearance,
        }, this.jwtSecret, {
            expiresIn: '15m', // Short-lived access token
            issuer: 'intelgraph-platform',
            audience: 'intelgraph-users',
        });
    }
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken(user, sessionId) {
        return jwt.sign({
            userId: user.id,
            sessionId,
            type: 'refresh',
        }, this.jwtRefreshSecret, {
            expiresIn: '7d', // Long-lived refresh token
            issuer: 'intelgraph-platform',
            audience: 'intelgraph-users',
        });
    }
    /**
     * Check user permissions
     */
    hasPermission(user, permission) {
        return user.permissions.includes(permission);
    }
    /**
     * Check access to classified information
     */
    canAccessClassification(user, classification) {
        const clearanceHierarchy = [
            'PUBLIC',
            'INTERNAL',
            'CONFIDENTIAL',
            'SECRET',
            'TOP_SECRET',
            'COMPARTMENTED',
        ];
        const userLevel = clearanceHierarchy.indexOf(user.securityClearance);
        const requiredLevel = clearanceHierarchy.indexOf(classification);
        return userLevel >= requiredLevel;
    }
    /**
     * Log security event
     */
    async logSecurityEvent(event) {
        const securityEvent = {
            ...event,
            id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            resolved: false,
        };
        this.securityEvents.unshift(securityEvent);
        // Keep only the most recent events
        if (this.securityEvents.length > this.maxEventHistory) {
            this.securityEvents = this.securityEvents.slice(0, this.maxEventHistory);
        }
        // Emit event for real-time monitoring
        this.emit('securityEvent', securityEvent);
        // Cache high-risk events
        if (securityEvent.riskLevel === 'CRITICAL' || securityEvent.riskLevel === 'HIGH') {
            await cacheService.set(`security_event:${securityEvent.id}`, securityEvent, 3600);
        }
        console.log(`[SECURITY] ${securityEvent.riskLevel} event: ${securityEvent.description}`);
    }
    /**
     * Log audit event
     */
    async logAuditEvent(event) {
        const auditLog = {
            ...event,
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            details: event,
        };
        this.auditLogs.unshift(auditLog);
        // Keep only the most recent logs
        if (this.auditLogs.length > this.maxAuditHistory) {
            this.auditLogs = this.auditLogs.slice(0, this.maxAuditHistory);
        }
        // Cache all audit logs for compliance
        await cacheService.set(`audit:${auditLog.id}`, auditLog, 86400 * 30); // 30 days
    }
    /**
     * Calculate access risk score
     */
    calculateRiskScore(user, ipAddress, userAgent) {
        let risk = 0;
        // User-based risk factors
        if (user.failedLoginAttempts > 0)
            risk += user.failedLoginAttempts * 0.1;
        if (!user.mfaEnabled)
            risk += 0.2;
        if (user.role === 'ADMIN')
            risk += 0.1; // Higher scrutiny for admins
        // IP-based risk factors
        if (!this.isInternalIP(ipAddress))
            risk += 0.3;
        if (this.isSuspiciousIP(ipAddress))
            risk += 0.5;
        // Time-based risk factors
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22)
            risk += 0.2; // After hours access
        // Device-based risk factors
        if (this.isUnknownDevice(userAgent))
            risk += 0.3;
        return Math.min(risk, 1.0); // Cap at 1.0
    }
    /**
     * Validate access context restrictions
     */
    validateAccessContext(user, ipAddress, userAgent) {
        const context = user.accessContext;
        // IP whitelist check
        if (context.ipWhitelist.length > 0 && !context.ipWhitelist.includes(ipAddress)) {
            return false;
        }
        // Time restrictions check
        if (context.timeRestrictions.length > 0) {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const allowed = context.timeRestrictions.some((restriction) => {
                return (restriction.daysOfWeek.includes(currentDay) &&
                    currentTime >= restriction.startTime &&
                    currentTime <= restriction.endTime);
            });
            if (!allowed)
                return false;
        }
        // Device restrictions
        const deviceType = this.detectDeviceType(userAgent);
        if (context.deviceRestrictions.allowedDeviceTypes.length > 0 &&
            !context.deviceRestrictions.allowedDeviceTypes.includes(deviceType)) {
            return false;
        }
        return true;
    }
    /**
     * Get security statistics
     */
    getSecurityStatistics() {
        const activeUsers = Array.from(this.users.values()).filter((u) => u.isActive).length;
        const activeSessions = Array.from(this.sessions.values()).filter((s) => s.isActive).length;
        const recentEvents = this.securityEvents.slice(0, 100);
        const eventsByType = recentEvents.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {});
        const eventsByRisk = recentEvents.reduce((acc, event) => {
            acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
            return acc;
        }, {});
        return {
            users: {
                total: this.users.size,
                active: activeUsers,
                locked: Array.from(this.users.values()).filter((u) => u.lockedUntil).length,
                mfaEnabled: Array.from(this.users.values()).filter((u) => u.mfaEnabled).length,
            },
            sessions: {
                active: activeSessions,
                total: this.sessions.size,
            },
            events: {
                recent: recentEvents.length,
                byType: eventsByType,
                byRisk: eventsByRisk,
            },
            audit: {
                total: this.auditLogs.length,
                recent: this.auditLogs.slice(0, 24).length, // Last 24 hours approximation
            },
        };
    }
    /**
     * Get recent security events
     */
    getRecentSecurityEvents(limit = 50) {
        return this.securityEvents.slice(0, limit);
    }
    /**
     * Get audit logs
     */
    getAuditLogs(limit = 100) {
        return this.auditLogs.slice(0, limit);
    }
    // Helper methods
    isInternalIP(ip) {
        return (ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            ip.startsWith('172.16.') ||
            ip === '127.0.0.1');
    }
    isSuspiciousIP(ip) {
        // Implementation would check against threat intelligence feeds
        return false;
    }
    isUnknownDevice(userAgent) {
        // Implementation would check against known device fingerprints
        return false;
    }
    detectDeviceType(userAgent) {
        if (userAgent.includes('Mobile'))
            return 'MOBILE';
        if (userAgent.includes('Tablet'))
            return 'TABLET';
        return 'DESKTOP';
    }
    generateDeviceFingerprint(userAgent) {
        // Simple fingerprint based on user agent
        return Buffer.from(userAgent).toString('base64').substr(0, 16);
    }
    cleanupExpiredSessions() {
        const now = new Date();
        let cleanedUp = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (!session.isActive || new Date(session.expiresAt) < now) {
                this.sessions.delete(sessionId);
                cacheService.delete(`session:${sessionId}`);
                cleanedUp++;
            }
        }
        if (cleanedUp > 0) {
            console.log(`[SECURITY] Cleaned up ${cleanedUp} expired sessions`);
        }
    }
    cleanupOldEvents() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
        // Clean security events
        const eventsBefore = this.securityEvents.length;
        this.securityEvents = this.securityEvents.filter((event) => new Date(event.timestamp).getTime() > cutoff);
        // Clean audit logs (keep for longer - 30 days)
        const auditCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const auditBefore = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter((log) => new Date(log.timestamp).getTime() > auditCutoff);
        if (eventsBefore !== this.securityEvents.length || auditBefore !== this.auditLogs.length) {
            console.log(`[SECURITY] Cleaned up old events and audit logs`);
        }
    }
}
// Global security service instance
export const securityService = new SecurityService();
//# sourceMappingURL=securityService.js.map