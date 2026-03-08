"use strict";
// @ts-nocheck
/**
 * Preferences Manager
 *
 * Manages user and role notification preferences for noise control.
 * Preferences determine:
 * - Which channels are enabled for a user
 * - Minimum severity thresholds per event type
 * - Quiet hours configuration
 * - Event type filters (include/exclude)
 * - Batching preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesManager = exports.InMemoryPreferencesStorage = void 0;
const EventSchema_js_1 = require("../events/EventSchema.js");
/**
 * In-memory storage implementation (replace with database in production)
 */
class InMemoryPreferencesStorage {
    userPreferences = new Map();
    rolePreferences = new Map();
    userRoles = new Map();
    async getUserPreferences(userId) {
        return this.userPreferences.get(userId) || null;
    }
    async setUserPreferences(userId, preferences) {
        this.userPreferences.set(userId, preferences);
    }
    async getRolePreferences(roleId) {
        return this.rolePreferences.get(roleId) || null;
    }
    async setRolePreferences(roleId, preferences) {
        this.rolePreferences.set(roleId, preferences);
    }
    async getUserRoles(userId) {
        return this.userRoles.get(userId) || [];
    }
    setUserRoles(userId, roles) {
        this.userRoles.set(userId, roles);
    }
}
exports.InMemoryPreferencesStorage = InMemoryPreferencesStorage;
/**
 * Preferences Manager
 */
class PreferencesManager {
    storage;
    defaultPreferences;
    constructor(storage) {
        this.storage = storage || new InMemoryPreferencesStorage();
        this.defaultPreferences = this.createDefaultPreferences();
    }
    /**
     * Get effective preferences for a user
     * Merges user preferences with role preferences
     */
    async getEffectivePreferences(userId) {
        // Get user's explicit preferences
        const userPrefs = await this.storage.getUserPreferences(userId);
        // Get user's roles
        const roles = await this.storage.getUserRoles(userId);
        // Get role preferences
        const rolePrefs = [];
        for (const roleId of roles) {
            const rolePref = await this.storage.getRolePreferences(roleId);
            if (rolePref) {
                rolePrefs.push(rolePref);
            }
        }
        // Sort role preferences by priority (highest first)
        rolePrefs.sort((a, b) => b.priority - a.priority);
        // Merge preferences: user > role (by priority) > default
        let effective = { ...this.defaultPreferences };
        // Apply role preferences (lowest priority first)
        for (const rolePref of rolePrefs.reverse()) {
            effective = this.mergePreferences(effective, rolePref.preferences);
        }
        // Apply user preferences (highest priority)
        if (userPrefs) {
            effective = this.mergePreferences(effective, userPrefs);
        }
        return effective;
    }
    /**
     * Set user preferences
     */
    async setUserPreferences(userId, preferences) {
        const current = await this.storage.getUserPreferences(userId) || this.defaultPreferences;
        const updated = this.mergePreferences(current, preferences);
        await this.storage.setUserPreferences(userId, updated);
        return updated;
    }
    /**
     * Set role preferences
     */
    async setRolePreferences(roleId, roleName, preferences, priority = 50) {
        const current = await this.storage.getRolePreferences(roleId);
        const basePrefs = current?.preferences || this.defaultPreferences;
        const updated = this.mergePreferences(basePrefs, preferences);
        const rolePrefs = {
            roleId,
            roleName,
            preferences: updated,
            priority,
        };
        await this.storage.setRolePreferences(roleId, rolePrefs);
        return rolePrefs;
    }
    /**
     * Enable/disable a channel for a user
     */
    async setChannelEnabled(userId, channel, enabled) {
        const prefs = await this.getEffectivePreferences(userId);
        if (!prefs.channels[channel]) {
            prefs.channels[channel] = this.createDefaultChannelPreference();
        }
        prefs.channels[channel].enabled = enabled;
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Set minimum severity threshold for a channel
     */
    async setChannelMinSeverity(userId, channel, severity) {
        const prefs = await this.getEffectivePreferences(userId);
        if (!prefs.channels[channel]) {
            prefs.channels[channel] = this.createDefaultChannelPreference();
        }
        prefs.channels[channel].minSeverity = severity;
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Set quiet hours for a user
     */
    async setQuietHours(userId, enabled, start, end, timezone = 'UTC') {
        const prefs = await this.getEffectivePreferences(userId);
        prefs.quietHours = {
            enabled,
            start,
            end,
            timezone,
        };
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Add event type to exclusion list
     */
    async excludeEventType(userId, eventType) {
        const prefs = await this.getEffectivePreferences(userId);
        if (!prefs.eventTypeFilters) {
            prefs.eventTypeFilters = {};
        }
        if (!prefs.eventTypeFilters.exclude) {
            prefs.eventTypeFilters.exclude = [];
        }
        if (!prefs.eventTypeFilters.exclude.includes(eventType)) {
            prefs.eventTypeFilters.exclude.push(eventType);
        }
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Remove event type from exclusion list
     */
    async includeEventType(userId, eventType) {
        const prefs = await this.getEffectivePreferences(userId);
        if (prefs.eventTypeFilters?.exclude) {
            prefs.eventTypeFilters.exclude = prefs.eventTypeFilters.exclude.filter((t) => t !== eventType);
        }
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Set severity threshold for specific event type
     */
    async setEventTypeSeverityThreshold(userId, eventType, severity) {
        const prefs = await this.getEffectivePreferences(userId);
        if (!prefs.severityThresholds) {
            prefs.severityThresholds = {};
        }
        prefs.severityThresholds[eventType] = severity;
        await this.storage.setUserPreferences(userId, prefs);
    }
    /**
     * Reset user preferences to defaults
     */
    async resetUserPreferences(userId) {
        const defaults = this.createDefaultPreferences();
        await this.storage.setUserPreferences(userId, defaults);
        return defaults;
    }
    /**
     * Merge two preference objects (second overrides first)
     */
    mergePreferences(base, override) {
        return {
            userId: override.userId || base.userId,
            channels: {
                email: override.channels?.email
                    ? { ...base.channels.email, ...override.channels.email }
                    : base.channels.email,
                chat: override.channels?.chat
                    ? { ...base.channels.chat, ...override.channels.chat }
                    : base.channels.chat,
                webhook: override.channels?.webhook
                    ? { ...base.channels.webhook, ...override.channels.webhook }
                    : base.channels.webhook,
            },
            quietHours: override.quietHours || base.quietHours,
            severityThresholds: {
                ...base.severityThresholds,
                ...override.severityThresholds,
            },
            eventTypeFilters: override.eventTypeFilters || base.eventTypeFilters,
        };
    }
    /**
     * Create default preferences
     */
    createDefaultPreferences() {
        return {
            userId: '',
            channels: {
                email: {
                    enabled: true,
                    minSeverity: EventSchema_js_1.EventSeverity.MEDIUM,
                    batchingEnabled: false,
                },
                chat: {
                    enabled: true,
                    minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    batchingEnabled: false,
                },
                webhook: {
                    enabled: false,
                },
                sms: {
                    enabled: false,
                    minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    batchingEnabled: false,
                },
                push: {
                    enabled: false,
                    minSeverity: EventSchema_js_1.EventSeverity.MEDIUM,
                    batchingEnabled: false,
                },
                realtime: {
                    enabled: true,
                    minSeverity: EventSchema_js_1.EventSeverity.INFO,
                    batchingEnabled: false,
                },
            },
            quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00',
                timezone: 'UTC',
            },
            severityThresholds: {},
            eventTypeFilters: {},
        };
    }
    /**
     * Create default channel preference
     */
    createDefaultChannelPreference() {
        return {
            enabled: true,
            minSeverity: EventSchema_js_1.EventSeverity.MEDIUM,
            batchingEnabled: false,
        };
    }
    /**
     * Get default role preferences for common roles
     */
    static getDefaultRolePreferences() {
        return {
            // Admin - receives all critical notifications
            admin: {
                channels: {
                    email: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.MEDIUM,
                    },
                    chat: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    },
                },
                severityThresholds: {},
            },
            // Security Team - focuses on security events
            security: {
                channels: {
                    email: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                        eventTypes: [
                            EventSchema_js_1.EventType.SECURITY_ALERT,
                            EventSchema_js_1.EventType.POLICY_VIOLATION,
                            EventSchema_js_1.EventType.ACCESS_DENIED,
                            EventSchema_js_1.EventType.CLEARANCE_VIOLATION,
                        ],
                    },
                    chat: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.CRITICAL,
                    },
                },
                eventTypeFilters: {
                    include: [
                        EventSchema_js_1.EventType.SECURITY_ALERT,
                        EventSchema_js_1.EventType.POLICY_VIOLATION,
                        EventSchema_js_1.EventType.ACCESS_DENIED,
                        EventSchema_js_1.EventType.CLEARANCE_VIOLATION,
                        EventSchema_js_1.EventType.AUTHORITY_APPROVAL_REQUIRED,
                        EventSchema_js_1.EventType.AUTHORITY_DISSENT,
                    ],
                },
            },
            // DevOps - focuses on infrastructure and deployments
            devops: {
                channels: {
                    email: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                        eventTypes: [
                            EventSchema_js_1.EventType.ALERT_TRIGGERED,
                            EventSchema_js_1.EventType.SLO_VIOLATION,
                            EventSchema_js_1.EventType.GOLDEN_PATH_BROKEN,
                            EventSchema_js_1.EventType.PIPELINE_FAILED,
                            EventSchema_js_1.EventType.DEPLOYMENT_FAILED,
                        ],
                    },
                    chat: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    },
                },
                eventTypeFilters: {
                    include: [
                        EventSchema_js_1.EventType.ALERT_TRIGGERED,
                        EventSchema_js_1.EventType.SLO_VIOLATION,
                        EventSchema_js_1.EventType.GOLDEN_PATH_BROKEN,
                        EventSchema_js_1.EventType.PIPELINE_STARTED,
                        EventSchema_js_1.EventType.PIPELINE_COMPLETED,
                        EventSchema_js_1.EventType.PIPELINE_FAILED,
                        EventSchema_js_1.EventType.DEPLOYMENT_COMPLETED,
                        EventSchema_js_1.EventType.DEPLOYMENT_FAILED,
                        EventSchema_js_1.EventType.SYSTEM_HEALTH_DEGRADED,
                    ],
                },
            },
            // Investigator - focuses on investigation events
            investigator: {
                channels: {
                    email: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.MEDIUM,
                        eventTypes: [
                            EventSchema_js_1.EventType.INVESTIGATION_CREATED,
                            EventSchema_js_1.EventType.INVESTIGATION_UPDATED,
                            EventSchema_js_1.EventType.EVIDENCE_ADDED,
                            EventSchema_js_1.EventType.ENTITY_DISCOVERED,
                            EventSchema_js_1.EventType.ENTITY_RISK_CHANGED,
                        ],
                    },
                    chat: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    },
                },
                eventTypeFilters: {
                    include: [
                        EventSchema_js_1.EventType.INVESTIGATION_CREATED,
                        EventSchema_js_1.EventType.INVESTIGATION_UPDATED,
                        EventSchema_js_1.EventType.INVESTIGATION_SHARED,
                        EventSchema_js_1.EventType.EVIDENCE_ADDED,
                        EventSchema_js_1.EventType.ENTITY_DISCOVERED,
                        EventSchema_js_1.EventType.ENTITY_RISK_CHANGED,
                        EventSchema_js_1.EventType.COPILOT_ANOMALY_DETECTED,
                    ],
                },
            },
            // Viewer - minimal notifications, only direct mentions
            viewer: {
                channels: {
                    email: {
                        enabled: true,
                        minSeverity: EventSchema_js_1.EventSeverity.HIGH,
                    },
                    chat: {
                        enabled: false,
                    },
                },
                eventTypeFilters: {
                    include: [
                        EventSchema_js_1.EventType.USER_MENTIONED,
                        EventSchema_js_1.EventType.COLLABORATION_INVITE,
                    ],
                },
            },
        };
    }
}
exports.PreferencesManager = PreferencesManager;
