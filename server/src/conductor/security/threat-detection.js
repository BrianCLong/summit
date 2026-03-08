"use strict";
// Real-Time Threat Detection & Behavioral Analytics
// Advanced security monitoring with machine learning-based anomaly detection
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatDetectionEngine = exports.ThreatDetectionEngine = void 0;
exports.threatDetectionMiddleware = threatDetectionMiddleware;
const prometheus_js_1 = require("../observability/prometheus.js");
const ioredis_1 = __importDefault(require("ioredis"));
class ThreatDetectionEngine {
    redis;
    rules = new Map();
    alertCooldowns = new Map();
    constructor(redis) {
        this.redis = redis;
        this.initializeDefaultRules();
    }
    /**
     * Analyze user behavior for threats in real-time
     */
    async analyzeRequest(context) {
        const alerts = [];
        let blocked = false;
        let maxRiskScore = 0;
        // Update user behavior profile
        const behaviorUpdate = await this.updateUserProfile(context);
        // Run all threat detection rules
        for (const [ruleId, rule] of this.rules.entries()) {
            try {
                if (rule.condition(context)) {
                    const alert = await this.createThreatAlert(rule, context);
                    // Check cooldown
                    const cooldownKey = `${rule.id}:${context.userId}`;
                    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
                    if (Date.now() - lastAlert > rule.cooldownMs) {
                        alerts.push(alert);
                        this.alertCooldowns.set(cooldownKey, Date.now());
                        maxRiskScore = Math.max(maxRiskScore, alert.riskScore);
                        // Execute rule action
                        if (rule.action === 'block' || rule.action === 'quarantine') {
                            blocked = true;
                        }
                        // Record threat detection metrics
                        prometheus_js_1.prometheusConductorMetrics.recordSecurityEvent(`threat_${rule.severity}`, !blocked);
                    }
                }
            }
            catch (error) {
                console.error(`Threat detection rule ${ruleId} failed:`, error);
            }
        }
        // Machine learning anomaly detection
        const anomalyScore = await this.calculateAnomalyScore(context);
        if (anomalyScore > 0.8) {
            const anomalyAlert = await this.createAnomalyAlert(context, anomalyScore);
            alerts.push(anomalyAlert);
            maxRiskScore = Math.max(maxRiskScore, anomalyScore * 100);
        }
        // Store alerts for investigation
        if (alerts.length > 0) {
            await this.storeAlerts(alerts);
        }
        return {
            allowed: !blocked,
            alerts,
            riskScore: maxRiskScore,
            behaviorUpdate,
        };
    }
    /**
     * Get user behavior profile
     */
    async getUserProfile(userId) {
        try {
            const profileData = await this.redis.get(`threat:profile:${userId}`);
            return profileData ? JSON.parse(profileData) : null;
        }
        catch (error) {
            console.error('Failed to load user profile:', error);
            return null;
        }
    }
    /**
     * Update user behavior profile with new activity
     */
    async updateUserProfile(context) {
        const profile = context.userProfile || (await this.createBaselineProfile(context.userId));
        const now = Date.now();
        const currentHour = new Date().getHours();
        // Update recent activity
        profile.recentActivity = profile.recentActivity || [];
        profile.recentActivity.push({
            timestamp: now,
            action: context.currentRequest.action,
            expert: context.currentRequest.expert,
            cost: context.currentRequest.cost,
            anomalyScore: 0, // Will be calculated later
        });
        // Keep only last 100 activities
        profile.recentActivity = profile.recentActivity.slice(-100);
        // Update baseline patterns
        if (profile.recentActivity.length >= 10) {
            const recentCosts = profile.recentActivity.map((a) => a.cost);
            const recentExperts = profile.recentActivity
                .filter((a) => a.expert)
                .map((a) => a.expert);
            profile.baselinePatterns.avgCostPerTask =
                recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
            profile.baselinePatterns.commonExperts = this.getMostFrequent(recentExperts, 3);
            // Update active hours
            const activeHours = profile.recentActivity.map((a) => new Date(a.timestamp).getHours());
            profile.baselinePatterns.usualActiveHours = this.getMostFrequent(activeHours, 8);
        }
        profile.lastUpdated = now;
        // Calculate risk score
        profile.riskScore = await this.calculateUserRiskScore(profile);
        // Store updated profile
        await this.redis.setex(`threat:profile:${context.userId}`, 86400 * 7, // 7 days TTL
        JSON.stringify(profile));
        return profile;
    }
    /**
     * Calculate anomaly score using behavioral analysis
     */
    async calculateAnomalyScore(context) {
        const profile = context.userProfile;
        if (!profile)
            return 0;
        let anomalyScore = 0;
        const factors = [];
        // Time-based anomaly (unusual hour)
        const currentHour = new Date().getHours();
        if (!profile.baselinePatterns.usualActiveHours.includes(currentHour)) {
            factors.push({ name: 'unusual_hour', score: 0.3, weight: 0.15 });
        }
        // Cost anomaly
        const costDeviation = Math.abs(context.currentRequest.cost - profile.baselinePatterns.avgCostPerTask) / Math.max(profile.baselinePatterns.avgCostPerTask, 1);
        if (costDeviation > 2) {
            factors.push({
                name: 'cost_anomaly',
                score: Math.min(costDeviation / 5, 1),
                weight: 0.25,
            });
        }
        // Expert usage anomaly
        if (context.currentRequest.expert &&
            !profile.baselinePatterns.commonExperts.includes(context.currentRequest.expert)) {
            factors.push({ name: 'unusual_expert', score: 0.4, weight: 0.2 });
        }
        // Request frequency anomaly
        const recentRequests = profile.recentActivity.filter((a) => Date.now() - a.timestamp < 3600000);
        const requestsPerHour = recentRequests.length;
        if (requestsPerHour > profile.baselinePatterns.avgRequestsPerHour * 3) {
            factors.push({ name: 'high_frequency', score: 0.6, weight: 0.3 });
        }
        // Task complexity anomaly (simplified heuristic)
        const taskComplexity = context.currentRequest.task.split(' ').length;
        if (Math.abs(taskComplexity - profile.baselinePatterns.typicalTaskComplexity) > 50) {
            factors.push({ name: 'unusual_complexity', score: 0.3, weight: 0.1 });
        }
        // Calculate weighted anomaly score
        anomalyScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
        return Math.min(anomalyScore, 1);
    }
    /**
     * Create baseline profile for new user
     */
    async createBaselineProfile(userId) {
        return {
            userId,
            baselinePatterns: {
                avgRequestsPerHour: 5,
                commonExperts: ['LLM_LIGHT', 'RAG_TOOL'],
                typicalTaskComplexity: 20,
                usualActiveHours: [9, 10, 11, 13, 14, 15, 16, 17],
                avgCostPerTask: 0.05,
                geoLocations: ['US'],
            },
            recentActivity: [],
            riskScore: 0,
            lastUpdated: Date.now(),
        };
    }
    /**
     * Initialize default threat detection rules
     */
    initializeDefaultRules() {
        // Rapid-fire requests (potential DDoS)
        this.rules.set('rapid_requests', {
            id: 'rapid_requests',
            name: 'Rapid Request Detection',
            description: 'Detects unusually high request frequency',
            severity: 'high',
            condition: (ctx) => {
                const recentRequests = ctx.recentActivities.filter((a) => Date.now() - a.timestamp < 60000);
                return recentRequests.length > 50;
            },
            action: 'block',
            cooldownMs: 300000, // 5 minutes
        });
        // Unusual time access
        this.rules.set('off_hours_access', {
            id: 'off_hours_access',
            name: 'Off-Hours Access',
            description: 'Access during unusual hours for user',
            severity: 'medium',
            condition: (ctx) => {
                const currentHour = new Date().getHours();
                return (!ctx.userProfile.baselinePatterns.usualActiveHours.includes(currentHour) &&
                    (currentHour < 6 || currentHour > 22));
            },
            action: 'alert',
            cooldownMs: 3600000, // 1 hour
        });
        // High-cost operations
        this.rules.set('high_cost_operation', {
            id: 'high_cost_operation',
            name: 'High Cost Operation',
            description: 'Expensive operations exceeding user baseline',
            severity: 'medium',
            condition: (ctx) => {
                return (ctx.currentRequest.cost >
                    ctx.userProfile.baselinePatterns.avgCostPerTask * 10);
            },
            action: 'alert',
            cooldownMs: 300000, // 5 minutes
        });
        // PII extraction attempt
        this.rules.set('pii_extraction', {
            id: 'pii_extraction',
            name: 'PII Extraction Attempt',
            description: 'Potential attempt to extract PII data',
            severity: 'critical',
            condition: (ctx) => {
                const suspiciousPatterns = [
                    'extract',
                    'list all',
                    'dump',
                    'export users',
                    'get passwords',
                ];
                return (suspiciousPatterns.some((pattern) => ctx.currentRequest.task.toLowerCase().includes(pattern)) &&
                    (ctx.currentRequest.task.toLowerCase().includes('email') ||
                        ctx.currentRequest.task.toLowerCase().includes('phone') ||
                        ctx.currentRequest.task.toLowerCase().includes('ssn')));
            },
            action: 'block',
            cooldownMs: 0, // No cooldown for critical threats
        });
        // Privilege escalation attempt
        this.rules.set('privilege_escalation', {
            id: 'privilege_escalation',
            name: 'Privilege Escalation',
            description: 'Attempt to access restricted experts without permission',
            severity: 'high',
            condition: (ctx) => {
                const restrictedExperts = ['OSINT_TOOL'];
                return !!(ctx.currentRequest.expert &&
                    restrictedExperts.includes(ctx.currentRequest.expert) &&
                    !ctx.userProfile.baselinePatterns.commonExperts.includes(ctx.currentRequest.expert));
            },
            action: 'block',
            cooldownMs: 600000, // 10 minutes
        });
    }
    async createThreatAlert(rule, context) {
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: context.userId,
            threatType: rule.id,
            severity: rule.severity,
            description: rule.description,
            evidence: [
                {
                    type: 'request_context',
                    data: context.currentRequest,
                },
                {
                    type: 'user_profile',
                    data: {
                        riskScore: context.userProfile.riskScore,
                        recentActivityCount: context.userProfile.recentActivity.length,
                    },
                },
            ],
            timestamp: Date.now(),
            sourceIP: context.currentRequest.sourceIP,
            blocked: rule.action === 'block' || rule.action === 'quarantine',
            riskScore: this.severityToRiskScore(rule.severity),
        };
    }
    async createAnomalyAlert(context, anomalyScore) {
        return {
            id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: context.userId,
            threatType: 'behavioral_anomaly',
            severity: anomalyScore > 0.9 ? 'critical' : 'high',
            description: 'Behavioral anomaly detected using machine learning',
            evidence: [
                {
                    type: 'anomaly_score',
                    data: { score: anomalyScore, threshold: 0.8 },
                },
                {
                    type: 'baseline_deviation',
                    data: context.userProfile.baselinePatterns,
                },
            ],
            timestamp: Date.now(),
            sourceIP: context.currentRequest.sourceIP,
            blocked: anomalyScore > 0.9,
            riskScore: anomalyScore * 100,
        };
    }
    async storeAlerts(alerts) {
        for (const alert of alerts) {
            await this.redis.zadd('threat:alerts', alert.timestamp, JSON.stringify(alert));
        }
        // Keep only last 1000 alerts
        await this.redis.zremrangebyrank('threat:alerts', 0, -1001);
    }
    severityToRiskScore(severity) {
        switch (severity) {
            case 'low':
                return 25;
            case 'medium':
                return 50;
            case 'high':
                return 75;
            case 'critical':
                return 100;
            default:
                return 0;
        }
    }
    async calculateUserRiskScore(profile) {
        let riskScore = 0;
        // Recent alerts increase risk
        const recentAlertsKey = `threat:recent_alerts:${profile.userId}`;
        const recentAlerts = await this.redis.zcount(recentAlertsKey, Date.now() - 86400000, // Last 24 hours
        Date.now());
        riskScore += Math.min(recentAlerts * 10, 50);
        // High frequency activity
        const avgRequestsPerHour = profile.baselinePatterns.avgRequestsPerHour;
        if (avgRequestsPerHour > 50) {
            riskScore += 20;
        }
        // High cost operations
        if (profile.baselinePatterns.avgCostPerTask > 1.0) {
            riskScore += 15;
        }
        return Math.min(riskScore, 100);
    }
    getMostFrequent(array, limit) {
        const frequency = new Map();
        for (const item of array) {
            frequency.set(item, (frequency.get(item) || 0) + 1);
        }
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([item]) => item);
    }
}
exports.ThreatDetectionEngine = ThreatDetectionEngine;
// Singleton instance
exports.threatDetectionEngine = new ThreatDetectionEngine(new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379'));
/**
 * Express middleware for threat detection
 */
function threatDetectionMiddleware() {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id || 'anonymous';
            const userProfile = await exports.threatDetectionEngine.getUserProfile(userId);
            if (!userProfile) {
                // Skip threat detection for first-time users
                return next();
            }
            const context = {
                userId,
                userProfile,
                currentRequest: {
                    action: req.body?.query ? 'graphql_query' : req.method,
                    task: req.body?.query || '',
                    timestamp: Date.now(),
                    sourceIP: req.ip || req.connection.remoteAddress || 'unknown',
                    userAgent: req.get('User-Agent') || 'unknown',
                    cost: 0, // Will be updated after processing
                },
                recentActivities: userProfile.recentActivity,
                systemMetrics: {
                    avgResponseTime: 100, // Mock data
                    errorRate: 0.01,
                    activeUsers: 1,
                },
            };
            const analysis = await exports.threatDetectionEngine.analyzeRequest(context);
            if (!analysis.allowed) {
                console.warn('Request blocked by threat detection:', {
                    userId,
                    alerts: analysis.alerts.map((a) => a.threatType),
                    riskScore: analysis.riskScore,
                });
                return res.status(403).json({
                    error: 'Request blocked by security policies',
                    code: 'THREAT_DETECTED',
                    riskScore: analysis.riskScore,
                });
            }
            // Add analysis to request context
            req.threatAnalysis = analysis;
            next();
        }
        catch (error) {
            console.error('Threat detection middleware error:', error);
            next(); // Continue on error to avoid breaking the application
        }
    };
}
