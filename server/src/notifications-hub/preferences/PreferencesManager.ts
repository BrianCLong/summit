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

import {
  NotificationPreferences,
  ChannelPreference,
} from '../NotificationHub.js';
import { EventType, EventSeverity } from '../events/EventSchema.js';

export interface RolePreferences {
  roleId: string;
  roleName: string;
  preferences: NotificationPreferences;
  priority: number; // Higher priority preferences override lower ones
}

export interface PreferencesStorage {
  getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
  setUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void>;
  getRolePreferences(roleId: string): Promise<RolePreferences | null>;
  setRolePreferences(roleId: string, preferences: RolePreferences): Promise<void>;
  getUserRoles(userId: string): Promise<string[]>;
}

/**
 * In-memory storage implementation (replace with database in production)
 */
export class InMemoryPreferencesStorage implements PreferencesStorage {
  private userPreferences: Map<string, NotificationPreferences> = new Map();
  private rolePreferences: Map<string, RolePreferences> = new Map();
  private userRoles: Map<string, string[]> = new Map();

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    return this.userPreferences.get(userId) || null;
  }

  async setUserPreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    this.userPreferences.set(userId, preferences);
  }

  async getRolePreferences(roleId: string): Promise<RolePreferences | null> {
    return this.rolePreferences.get(roleId) || null;
  }

  async setRolePreferences(
    roleId: string,
    preferences: RolePreferences,
  ): Promise<void> {
    this.rolePreferences.set(roleId, preferences);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    return this.userRoles.get(userId) || [];
  }

  setUserRoles(userId: string, roles: string[]): void {
    this.userRoles.set(userId, roles);
  }
}

/**
 * Preferences Manager
 */
export class PreferencesManager {
  private storage: PreferencesStorage;
  private defaultPreferences: NotificationPreferences;

  constructor(storage?: PreferencesStorage) {
    this.storage = storage || new InMemoryPreferencesStorage();
    this.defaultPreferences = this.createDefaultPreferences();
  }

  /**
   * Get effective preferences for a user
   * Merges user preferences with role preferences
   */
  async getEffectivePreferences(userId: string): Promise<NotificationPreferences> {
    // Get user's explicit preferences
    const userPrefs = await this.storage.getUserPreferences(userId);

    // Get user's roles
    const roles = await this.storage.getUserRoles(userId);

    // Get role preferences
    const rolePrefs: RolePreferences[] = [];
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
  async setUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.storage.getUserPreferences(userId) || this.defaultPreferences;
    const updated = this.mergePreferences(current, preferences);
    await this.storage.setUserPreferences(userId, updated);
    return updated;
  }

  /**
   * Set role preferences
   */
  async setRolePreferences(
    roleId: string,
    roleName: string,
    preferences: Partial<NotificationPreferences>,
    priority: number = 50,
  ): Promise<RolePreferences> {
    const current = await this.storage.getRolePreferences(roleId);
    const basePrefs = current?.preferences || this.defaultPreferences;
    const updated = this.mergePreferences(basePrefs, preferences);

    const rolePrefs: RolePreferences = {
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
  async setChannelEnabled(
    userId: string,
    channel: 'email' | 'chat' | 'webhook',
    enabled: boolean,
  ): Promise<void> {
    const prefs = await this.getEffectivePreferences(userId);

    if (!prefs.channels[channel]) {
      prefs.channels[channel] = this.createDefaultChannelPreference();
    }

    prefs.channels[channel]!.enabled = enabled;

    await this.storage.setUserPreferences(userId, prefs);
  }

  /**
   * Set minimum severity threshold for a channel
   */
  async setChannelMinSeverity(
    userId: string,
    channel: 'email' | 'chat' | 'webhook',
    severity: EventSeverity,
  ): Promise<void> {
    const prefs = await this.getEffectivePreferences(userId);

    if (!prefs.channels[channel]) {
      prefs.channels[channel] = this.createDefaultChannelPreference();
    }

    prefs.channels[channel]!.minSeverity = severity;

    await this.storage.setUserPreferences(userId, prefs);
  }

  /**
   * Set quiet hours for a user
   */
  async setQuietHours(
    userId: string,
    enabled: boolean,
    start: string,
    end: string,
    timezone: string = 'UTC',
  ): Promise<void> {
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
  async excludeEventType(userId: string, eventType: EventType): Promise<void> {
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
  async includeEventType(userId: string, eventType: EventType): Promise<void> {
    const prefs = await this.getEffectivePreferences(userId);

    if (prefs.eventTypeFilters?.exclude) {
      prefs.eventTypeFilters.exclude = prefs.eventTypeFilters.exclude.filter(
        (t) => t !== eventType,
      );
    }

    await this.storage.setUserPreferences(userId, prefs);
  }

  /**
   * Set severity threshold for specific event type
   */
  async setEventTypeSeverityThreshold(
    userId: string,
    eventType: EventType,
    severity: EventSeverity,
  ): Promise<void> {
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
  async resetUserPreferences(userId: string): Promise<NotificationPreferences> {
    const defaults = this.createDefaultPreferences();
    await this.storage.setUserPreferences(userId, defaults);
    return defaults;
  }

  /**
   * Merge two preference objects (second overrides first)
   */
  private mergePreferences(
    base: NotificationPreferences,
    override: Partial<NotificationPreferences>,
  ): NotificationPreferences {
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
  private createDefaultPreferences(): NotificationPreferences {
    return {
      userId: '',
      channels: {
        email: {
          enabled: true,
          minSeverity: EventSeverity.MEDIUM,
          batchingEnabled: false,
        },
        chat: {
          enabled: true,
          minSeverity: EventSeverity.HIGH,
          batchingEnabled: false,
        },
        webhook: {
          enabled: false,
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
  private createDefaultChannelPreference(): ChannelPreference {
    return {
      enabled: true,
      minSeverity: EventSeverity.MEDIUM,
      batchingEnabled: false,
    };
  }

  /**
   * Get default role preferences for common roles
   */
  static getDefaultRolePreferences(): Record<string, Partial<NotificationPreferences>> {
    return {
      // Admin - receives all critical notifications
      admin: {
        channels: {
          email: {
            enabled: true,
            minSeverity: EventSeverity.MEDIUM,
          },
          chat: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
          },
        },
        severityThresholds: {},
      },

      // Security Team - focuses on security events
      security: {
        channels: {
          email: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
            eventTypes: [
              EventType.SECURITY_ALERT,
              EventType.POLICY_VIOLATION,
              EventType.ACCESS_DENIED,
              EventType.CLEARANCE_VIOLATION,
            ],
          },
          chat: {
            enabled: true,
            minSeverity: EventSeverity.CRITICAL,
          },
        },
        eventTypeFilters: {
          include: [
            EventType.SECURITY_ALERT,
            EventType.POLICY_VIOLATION,
            EventType.ACCESS_DENIED,
            EventType.CLEARANCE_VIOLATION,
            EventType.AUTHORITY_APPROVAL_REQUIRED,
            EventType.AUTHORITY_DISSENT,
          ],
        },
      },

      // DevOps - focuses on infrastructure and deployments
      devops: {
        channels: {
          email: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
            eventTypes: [
              EventType.ALERT_TRIGGERED,
              EventType.SLO_VIOLATION,
              EventType.GOLDEN_PATH_BROKEN,
              EventType.PIPELINE_FAILED,
              EventType.DEPLOYMENT_FAILED,
            ],
          },
          chat: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
          },
        },
        eventTypeFilters: {
          include: [
            EventType.ALERT_TRIGGERED,
            EventType.SLO_VIOLATION,
            EventType.GOLDEN_PATH_BROKEN,
            EventType.PIPELINE_STARTED,
            EventType.PIPELINE_COMPLETED,
            EventType.PIPELINE_FAILED,
            EventType.DEPLOYMENT_COMPLETED,
            EventType.DEPLOYMENT_FAILED,
            EventType.SYSTEM_HEALTH_DEGRADED,
          ],
        },
      },

      // Investigator - focuses on investigation events
      investigator: {
        channels: {
          email: {
            enabled: true,
            minSeverity: EventSeverity.MEDIUM,
            eventTypes: [
              EventType.INVESTIGATION_CREATED,
              EventType.INVESTIGATION_UPDATED,
              EventType.EVIDENCE_ADDED,
              EventType.ENTITY_DISCOVERED,
              EventType.ENTITY_RISK_CHANGED,
            ],
          },
          chat: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
          },
        },
        eventTypeFilters: {
          include: [
            EventType.INVESTIGATION_CREATED,
            EventType.INVESTIGATION_UPDATED,
            EventType.INVESTIGATION_SHARED,
            EventType.EVIDENCE_ADDED,
            EventType.ENTITY_DISCOVERED,
            EventType.ENTITY_RISK_CHANGED,
            EventType.COPILOT_ANOMALY_DETECTED,
          ],
        },
      },

      // Viewer - minimal notifications, only direct mentions
      viewer: {
        channels: {
          email: {
            enabled: true,
            minSeverity: EventSeverity.HIGH,
          },
          chat: {
            enabled: false,
          },
        },
        eventTypeFilters: {
          include: [
            EventType.USER_MENTIONED,
            EventType.COLLABORATION_INVITE,
          ],
        },
      },
    };
  }
}
