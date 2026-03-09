/**
 * @fileoverview LaunchDarkly Integration Provider
 * Full integration with LaunchDarkly for enterprise feature flag management
 * including real-time streaming, webhook handling, and comprehensive analytics.
 */

import { EventEmitter } from 'events';
import {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  FeatureFlagManager,
} from '../core/FeatureFlagManager.js';

/**
 * LaunchDarkly client configuration
 */
export interface LaunchDarklyConfig {
  sdkKey: string;
  environment: string;
  baseUri?: string;
  streamUri?: string;
  eventsUri?: string;
  timeout: number;
  capacity: number;
  flushInterval: number;
  pollInterval: number;
  streaming: boolean;
  sendEvents: boolean;
  offline: boolean;
  allAttributesPrivate: boolean;
  privateAttributes: string[];
  wrapperName?: string;
  wrapperVersion?: string;
}

/**
 * LaunchDarkly user context
 */
export interface LaunchDarklyUser {
  key: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  ip?: string;
  country?: string;
  anonymous?: boolean;
  custom?: Record<string, any>;
  privateAttributeNames?: string[];
}

/**
 * LaunchDarkly flag configuration
 */
export interface LaunchDarklyFlag {
  key: string;
  name: string;
  kind: 'boolean' | 'multivariate';
  description?: string;
  tags: string[];
  creationDate: Date;
  includeInSnippet?: boolean;
  clientSideAvailability: {
    usingMobileKey: boolean;
    usingEnvironmentId: boolean;
  };
  variations: Array<{
    _id: string;
    value: any;
    name?: string;
    description?: string;
  }>;
  targeting: {
    rules: Array<{
      _id: string;
      variation?: number;
      rollout?: {
        variations: Array<{
          variation: number;
          weight: number;
        }>;
        bucketBy?: string;
      };
      clauses: Array<{
        _id: string;
        attribute: string;
        op: string;
        values: any[];
        negate: boolean;
      }>;
    }>;
    fallthrough: {
      variation?: number;
      rollout?: {
        variations: Array<{
          variation: number;
          weight: number;
        }>;
        bucketBy?: string;
      };
    };
    offVariation: number;
  };
  prerequisites: Array<{
    key: string;
    variation: number;
  }>;
  salt: string;
  sel: string;
  deleted: boolean;
  version: number;
  optional?: boolean;
  trackEvents: boolean;
  trackEventsFallthrough: boolean;
  debugEventsUntilDate?: Date;
}

/**
 * LaunchDarkly webhook payload
 */
export interface LaunchDarklyWebhook {
  accesses: Array<{
    action: string;
    resource: string;
  }>;
  date: Date;
  kind: string;
  name: string;
  description: string;
  shortDescription: string;
  comment: string;
  member: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  titleVerb: string;
  title: string;
  target: {
    name: string;
    location: {
      environmentKey: string;
      projectKey: string;
    };
    resources: string[];
  };
  currentVersion: LaunchDarklyFlag;
  previousVersion?: LaunchDarklyFlag;
}

/**
 * LaunchDarkly metrics data
 */
export interface LaunchDarklyMetrics {
  flagKey: string;
  environmentKey: string;
  series: Array<{
    time: Date;
    value: number;
    variation?: string;
  }>;
}

/**
 * LaunchDarkly provider for feature flag integration
 */
export class LaunchDarklyProvider extends EventEmitter {
  private client: any; // LaunchDarkly client
  private connected: boolean = false;
  private flags: Map<string, LaunchDarklyFlag> = new Map();
  private webhookSecret?: string;

  constructor(
    private config: LaunchDarklyConfig,
    private flagManager: FeatureFlagManager,
  ) {
    super();
    this.initializeClient();
  }

  /**
   * Initialize LaunchDarkly client
   */
  private async initializeClient(): Promise<void> {
    try {
      // Import LaunchDarkly SDK
      const LaunchDarkly = await import('launchdarkly-node-server-sdk');

      // Create client instance
      this.client = LaunchDarkly.init(this.config.sdkKey, {
        baseUri: this.config.baseUri,
        streamUri: this.config.streamUri,
        eventsUri: this.config.eventsUri,
        timeout: this.config.timeout,
        capacity: this.config.capacity,
        flushInterval: this.config.flushInterval,
        pollInterval: this.config.pollInterval,
        streaming: this.config.streaming,
        sendEvents: this.config.sendEvents,
        offline: this.config.offline,
        allAttributesPrivate: this.config.allAttributesPrivate,
        privateAttributeNames: this.config.privateAttributes,
        wrapperName: this.config.wrapperName,
        wrapperVersion: this.config.wrapperVersion,
      });

      // Wait for client to be ready
      await this.client.waitForInitialization();
      this.connected = true;

      // Set up event handlers
      this.setupEventHandlers();

      // Sync initial flags
      await this.syncFlags();

      this.emit('connected');
      console.log('LaunchDarkly provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LaunchDarkly provider:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set up LaunchDarkly event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Connection events
    this.client.on('ready', () => {
      this.connected = true;
      this.emit('ready');
    });

    this.client.on('failed', (error: any) => {
      this.connected = false;
      this.emit('failed', error);
      console.error('LaunchDarkly client failed:', error);
    });

    this.client.on('error', (error: any) => {
      this.emit('error', error);
      console.error('LaunchDarkly client error:', error);
    });

    // Flag update events
    this.client.on('update', (settings: any) => {
      this.handleFlagUpdate(settings);
    });

    this.client.on('update:*', (key: string, current: any, previous: any) => {
      this.handleFlagChange(key, current, previous);
    });
  }

  /**
   * Handle flag updates from LaunchDarkly
   */
  private async handleFlagUpdate(settings: any): Promise<void> {
    try {
      await this.syncFlags();
      this.emit('flags:updated', { count: this.flags.size });
    } catch (error) {
      console.error('Failed to handle flag update:', error);
    }
  }

  /**
   * Handle individual flag changes
   */
  private async handleFlagChange(
    key: string,
    current: any,
    previous: any,
  ): Promise<void> {
    try {
      // Convert LaunchDarkly flag to internal format
      const internalFlag = await this.convertFromLaunchDarkly(current);

      // Update internal flag store
      this.flags.set(key, current);

      this.emit('flag:changed', {
        key,
        current: internalFlag,
        previous: previous
          ? await this.convertFromLaunchDarkly(previous)
          : null,
      });
    } catch (error) {
      console.error(`Failed to handle flag change for ${key}:`, error);
    }
  }

  /**
   * Evaluate feature flag using LaunchDarkly
   */
  async evaluateFlag(
    flagKey: string,
    context: EvaluationContext,
    defaultValue?: any,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      if (!this.connected || !this.client) {
        throw new Error('LaunchDarkly client not connected');
      }

      // Convert context to LaunchDarkly user format
      const ldUser = this.convertToLaunchDarklyUser(context);

      // Evaluate flag
      const variation = await this.client.variation(
        flagKey,
        ldUser,
        defaultValue,
      );
      const variationDetail = await this.client.variationDetail(
        flagKey,
        ldUser,
        defaultValue,
      );

      // Convert result to internal format
      const result: EvaluationResult = {
        flagKey,
        value: variation,
        variationId: variationDetail.variationIndex?.toString() || 'unknown',
        reason: this.convertEvaluationReason(variationDetail.reason),
        ruleId: variationDetail.reason.ruleId,
        metadata: {
          evaluatedAt: new Date(),
          version: this.flags.get(flagKey)?.version || 0,
          fromCache: false,
          evaluationTime: Date.now() - startTime,
        },
        trackingEnabled: true,
      };

      // Track evaluation event
      if (this.config.sendEvents) {
        await this.client.track('flag_evaluation', ldUser, {
          flagKey,
          variation: result.variationId,
          reason: result.reason,
          timestamp: result.metadata.evaluatedAt.getTime(),
        });
      }

      return result;
    } catch (error) {
      console.error(
        `LaunchDarkly flag evaluation failed for ${flagKey}:`,
        error,
      );

      return {
        flagKey,
        value: defaultValue,
        variationId: 'error',
        reason: 'error',
        metadata: {
          evaluatedAt: new Date(),
          version: 0,
          fromCache: false,
          evaluationTime: Date.now() - startTime,
        },
        trackingEnabled: false,
      };
    }
  }

  /**
   * Bulk evaluate multiple flags
   */
  async evaluateAllFlags(
    context: EvaluationContext,
  ): Promise<Record<string, EvaluationResult>> {
    try {
      if (!this.connected || !this.client) {
        throw new Error('LaunchDarkly client not connected');
      }

      const ldUser = this.convertToLaunchDarklyUser(context);
      const allFlags = await this.client.allFlagsState(ldUser);

      const results: Record<string, EvaluationResult> = {};

      for (const [flagKey, flagState] of Object.entries(allFlags.allValues())) {
        const detail = allFlags.getFlagValue(flagKey);

        results[flagKey] = {
          flagKey,
          value: flagState,
          variationId: detail?.variationIndex?.toString() || 'unknown',
          reason: detail?.reason
            ? this.convertEvaluationReason(detail.reason)
            : 'default',
          metadata: {
            evaluatedAt: new Date(),
            version: this.flags.get(flagKey)?.version || 0,
            fromCache: true,
            evaluationTime: 0,
          },
          trackingEnabled: detail?.trackEvents || false,
        };
      }

      return results;
    } catch (error) {
      console.error('LaunchDarkly bulk evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Create or update flag in LaunchDarkly
   */
  async createFlag(flag: FeatureFlag): Promise<void> {
    try {
      // Convert internal flag to LaunchDarkly format
      const ldFlag = await this.convertToLaunchDarkly(flag);

      // Use LaunchDarkly API to create/update flag
      await this.apiRequest(
        'POST',
        `/api/v2/flags/${this.config.environment}/${flag.key}`,
        ldFlag,
      );

      // Store locally
      this.flags.set(flag.key, ldFlag);

      this.emit('flag:created', { key: flag.key });
    } catch (error) {
      console.error(
        `Failed to create flag ${flag.key} in LaunchDarkly:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update flag in LaunchDarkly
   */
  async updateFlag(flag: FeatureFlag): Promise<void> {
    try {
      const ldFlag = await this.convertToLaunchDarkly(flag);

      await this.apiRequest(
        'PATCH',
        `/api/v2/flags/${this.config.environment}/${flag.key}`,
        {
          patch: [
            { op: 'replace', path: '/name', value: ldFlag.name },
            { op: 'replace', path: '/description', value: ldFlag.description },
            { op: 'replace', path: '/variations', value: ldFlag.variations },
            { op: 'replace', path: '/targeting', value: ldFlag.targeting },
          ],
        },
      );

      this.flags.set(flag.key, ldFlag);

      this.emit('flag:updated', { key: flag.key });
    } catch (error) {
      console.error(
        `Failed to update flag ${flag.key} in LaunchDarkly:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete flag in LaunchDarkly
   */
  async deleteFlag(flagKey: string): Promise<void> {
    try {
      await this.apiRequest(
        'DELETE',
        `/api/v2/flags/${this.config.environment}/${flagKey}`,
      );

      this.flags.delete(flagKey);

      this.emit('flag:deleted', { key: flagKey });
    } catch (error) {
      console.error(`Failed to delete flag ${flagKey} in LaunchDarkly:`, error);
      throw error;
    }
  }

  /**
   * Get flag metrics from LaunchDarkly
   */
  async getFlagMetrics(
    flagKey: string,
    timeRange: { start: Date; end: Date },
  ): Promise<LaunchDarklyMetrics> {
    try {
      const response = await this.apiRequest(
        'GET',
        `/api/v2/usage/evaluations/flags/${flagKey}/${this.config.environment}`,
        null,
        {
          from: timeRange.start.getTime(),
          to: timeRange.end.getTime(),
        },
      );

      return {
        flagKey,
        environmentKey: this.config.environment,
        series: response.series || [],
      };
    } catch (error) {
      console.error(`Failed to get metrics for flag ${flagKey}:`, error);
      throw error;
    }
  }

  /**
   * Handle webhook from LaunchDarkly
   */
  async handleWebhook(
    payload: LaunchDarklyWebhook,
    signature: string,
  ): Promise<void> {
    try {
      // Verify webhook signature if secret is configured
      if (this.webhookSecret) {
        const isValid = await this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process webhook based on kind
      switch (payload.kind) {
        case 'flag':
          await this.handleFlagWebhook(payload);
          break;

        case 'project':
          await this.handleProjectWebhook(payload);
          break;

        case 'environment':
          await this.handleEnvironmentWebhook(payload);
          break;

        default:
          console.log(`Unhandled webhook kind: ${payload.kind}`);
      }

      this.emit('webhook:processed', {
        kind: payload.kind,
        target: payload.target,
      });
    } catch (error) {
      console.error('Failed to process LaunchDarkly webhook:', error);
      this.emit('webhook:error', error);
      throw error;
    }
  }

  /**
   * Handle flag-related webhooks
   */
  private async handleFlagWebhook(payload: LaunchDarklyWebhook): Promise<void> {
    const flagKey = payload.target.name;

    switch (payload.accesses[0]?.action) {
      case 'updateOn':
      case 'updateOff':
        // Flag targeting changed
        if (payload.currentVersion) {
          this.flags.set(flagKey, payload.currentVersion);
          const internalFlag = await this.convertFromLaunchDarkly(
            payload.currentVersion,
          );

          this.emit('flag:targeting_updated', {
            key: flagKey,
            flag: internalFlag,
            enabled: payload.accesses[0].action === 'updateOn',
          });
        }
        break;

      case 'updateRules':
        // Targeting rules changed
        if (payload.currentVersion) {
          this.flags.set(flagKey, payload.currentVersion);

          this.emit('flag:rules_updated', {
            key: flagKey,
            rules: payload.currentVersion.targeting.rules,
          });
        }
        break;

      case 'updateFallthrough':
        // Fallthrough targeting changed
        if (payload.currentVersion) {
          this.flags.set(flagKey, payload.currentVersion);

          this.emit('flag:fallthrough_updated', {
            key: flagKey,
            fallthrough: payload.currentVersion.targeting.fallthrough,
          });
        }
        break;

      case 'createFlag':
        // New flag created
        if (payload.currentVersion) {
          this.flags.set(flagKey, payload.currentVersion);

          this.emit('flag:created_external', {
            key: flagKey,
            flag: await this.convertFromLaunchDarkly(payload.currentVersion),
          });
        }
        break;

      case 'deleteFlag':
        // Flag deleted
        this.flags.delete(flagKey);

        this.emit('flag:deleted_external', {
          key: flagKey,
        });
        break;
    }
  }

  /**
   * Handle project-related webhooks
   */
  private async handleProjectWebhook(
    payload: LaunchDarklyWebhook,
  ): Promise<void> {
    this.emit('project:updated', {
      projectKey: payload.target.location.projectKey,
      action: payload.accesses[0]?.action,
    });
  }

  /**
   * Handle environment-related webhooks
   */
  private async handleEnvironmentWebhook(
    payload: LaunchDarklyWebhook,
  ): Promise<void> {
    this.emit('environment:updated', {
      environmentKey: payload.target.location.environmentKey,
      action: payload.accesses[0]?.action,
    });
  }

  /**
   * Sync flags from LaunchDarkly
   */
  private async syncFlags(): Promise<void> {
    try {
      const allFlags = await this.apiRequest(
        'GET',
        `/api/v2/flags/${this.config.environment}`,
      );

      this.flags.clear();

      if (allFlags && allFlags.items) {
        for (const ldFlag of allFlags.items) {
          this.flags.set(ldFlag.key, ldFlag);
        }
      }

      console.log(`Synced ${this.flags.size} flags from LaunchDarkly`);
    } catch (error) {
      console.error('Failed to sync flags from LaunchDarkly:', error);
      throw error;
    }
  }

  /**
   * Convert evaluation context to LaunchDarkly user format
   */
  private convertToLaunchDarklyUser(
    context: EvaluationContext,
  ): LaunchDarklyUser {
    return {
      key: context.user.id,
      name: context.user.attributes.name,
      firstName: context.user.attributes.firstName,
      lastName: context.user.attributes.lastName,
      email: context.user.email,
      avatar: context.user.attributes.avatar,
      ip: context.request.ip,
      country: context.user.attributes.country,
      anonymous: context.user.attributes.anonymous || false,
      custom: {
        ...context.user.attributes,
        tenantId: context.tenant?.tenantId,
        sessionId: context.request.sessionId,
        userAgent: context.request.userAgent,
        environment: context.environment,
        version: context.version,
        ...context.customAttributes,
      },
      privateAttributeNames: this.config.privateAttributes,
    };
  }

  /**
   * Convert internal flag to LaunchDarkly format
   */
  private async convertToLaunchDarkly(
    flag: FeatureFlag,
  ): Promise<LaunchDarklyFlag> {
    return {
      key: flag.key,
      name: flag.name,
      kind: flag.type === 'boolean' ? 'boolean' : 'multivariate',
      description: flag.description,
      tags: flag.metadata.tags,
      creationDate: flag.metadata.createdAt,
      includeInSnippet: true,
      clientSideAvailability: {
        usingMobileKey: false,
        usingEnvironmentId: false,
      },
      variations: flag.variations.map((variation, index) => ({
        _id: variation.id,
        value: variation.value,
        name: variation.name,
        description: variation.description,
      })),
      targeting: {
        rules: flag.targeting.rules.map((rule) => ({
          _id: rule.id,
          variation: parseInt(rule.variation),
          clauses: rule.conditions.map((condition) => ({
            _id: `${rule.id}_${condition.attribute}`,
            attribute: condition.attribute,
            op: this.convertOperator(condition.operator),
            values: condition.values,
            negate: condition.negate || false,
          })),
        })),
        fallthrough: {
          variation: parseInt(flag.targeting.fallthrough.variationId),
        },
        offVariation: parseInt(flag.targeting.offVariation),
      },
      prerequisites: flag.dependencies.map((dep) => ({
        key: dep,
        variation: 0, // Default variation for prerequisite
      })),
      salt: this.generateSalt(flag.key),
      sel: this.generateSel(flag.key),
      deleted: flag.status === 'archived',
      version: flag.metadata.version,
      trackEvents: flag.analytics.enabled,
      trackEventsFallthrough: flag.analytics.enabled,
    };
  }

  /**
   * Convert LaunchDarkly flag to internal format
   */
  private async convertFromLaunchDarkly(
    ldFlag: LaunchDarklyFlag,
  ): Promise<FeatureFlag> {
    return {
      id: `ld_${ldFlag.key}`,
      key: ldFlag.key,
      name: ldFlag.name,
      description: ldFlag.description || '',
      type: ldFlag.kind === 'boolean' ? 'boolean' : 'multivariate',
      status: ldFlag.deleted ? 'archived' : 'active',
      defaultValue: ldFlag.variations[0]?.value,
      variations: ldFlag.variations.map((variation) => ({
        id: variation._id,
        name: variation.name || `Variation ${variation._id}`,
        value: variation.value,
        description: variation.description,
      })),
      targeting: {
        enabled: true,
        rules: ldFlag.targeting.rules.map((rule) => ({
          id: rule._id,
          description: `LaunchDarkly rule ${rule._id}`,
          conditions: rule.clauses.map((clause) => ({
            attribute: clause.attribute,
            operator: this.convertOperatorBack(clause.op),
            values: clause.values,
            negate: clause.negate,
          })),
          variation: rule.variation?.toString() || '0',
          priority: 0,
        })),
        fallthrough: {
          variationId:
            ldFlag.targeting.fallthrough.variation?.toString() || '0',
        },
        offVariation: ldFlag.targeting.offVariation.toString(),
      },
      rollout: {
        strategy: 'immediate',
        safetyChecks: [],
        automaticRollback: {
          enabled: false,
          triggers: [],
          rollbackToVariation: '0',
        },
        targeting: {},
      },
      metadata: {
        owner: 'launchdarkly',
        team: 'external',
        environment: this.config.environment,
        category: 'imported',
        tags: ldFlag.tags,
        createdAt: ldFlag.creationDate,
        updatedAt: new Date(),
        version: ldFlag.version,
      },
      analytics: {
        enabled: ldFlag.trackEvents,
        trackingEvents: [],
        customMetrics: [],
        cohortAnalysis: false,
        conversionTracking: {
          enabled: false,
          goalEvents: [],
        },
        sampling: {
          enabled: false,
          rate: 1.0,
        },
      },
      lifecycle: {
        temporary: false,
      },
      dependencies: ldFlag.prerequisites.map((prereq) => prereq.key),
      killSwitch: false,
    };
  }

  /**
   * Convert evaluation reason from LaunchDarkly format
   */
  private convertEvaluationReason(reason: any): any {
    if (!reason) return 'default';

    switch (reason.kind) {
      case 'OFF':
        return 'off';
      case 'TARGET_MATCH':
        return 'target_match';
      case 'RULE_MATCH':
        return 'rule_match';
      case 'FALLTHROUGH':
        return 'fallthrough';
      case 'ERROR':
        return 'error';
      case 'PREREQUISITE_FAILED':
        return 'prerequisite_failed';
      default:
        return 'default';
    }
  }

  /**
   * Convert internal operator to LaunchDarkly format
   */
  private convertOperator(operator: string): string {
    const mapping = {
      equals: 'in',
      not_equals: 'not_in',
      in: 'in',
      not_in: 'not_in',
      contains: 'contains',
      starts_with: 'startsWith',
      ends_with: 'endsWith',
      greater_than: 'greaterThan',
      less_than: 'lessThan',
      regex: 'matches',
    };

    return mapping[operator as keyof typeof mapping] || 'in';
  }

  /**
   * Convert LaunchDarkly operator back to internal format
   */
  private convertOperatorBack(operator: string): string {
    const mapping = {
      in: 'equals',
      not_in: 'not_equals',
      contains: 'contains',
      startsWith: 'starts_with',
      endsWith: 'ends_with',
      greaterThan: 'greater_than',
      lessThan: 'less_than',
      matches: 'regex',
    };

    return mapping[operator as keyof typeof mapping] || 'equals';
  }

  /**
   * Generate salt for LaunchDarkly flag
   */
  private generateSalt(flagKey: string): string {
    return require('crypto')
      .createHash('md5')
      .update(flagKey)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Generate sel for LaunchDarkly flag
   */
  private generateSel(flagKey: string): string {
    return require('crypto')
      .createHash('md5')
      .update(`sel_${flagKey}`)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Make API request to LaunchDarkly
   */
  private async apiRequest(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
  ): Promise<any> {
    const fetch = (await import('node-fetch')).default;

    const url = new URL(
      endpoint,
      this.config.baseUri || 'https://app.launchdarkly.com',
    );

    if (params) {
      Object.keys(params).forEach((key) => {
        url.searchParams.append(key, params[key].toString());
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: this.config.sdkKey,
        'Content-Type': 'application/json',
        'LD-API-Version': 'beta',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LaunchDarkly API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(
    payload: any,
    signature: string,
  ): Promise<boolean> {
    if (!this.webhookSecret) return true;

    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return `sha256=${computedSignature}` === signature;
  }

  /**
   * Set webhook secret for signature verification
   */
  setWebhookSecret(secret: string): void {
    this.webhookSecret = secret;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected && this.client?.initialized();
  }

  /**
   * Get all flags from local cache
   */
  getAllFlags(): Map<string, LaunchDarklyFlag> {
    return new Map(this.flags);
  }

  /**
   * Flush pending events to LaunchDarkly
   */
  async flush(): Promise<void> {
    if (this.client && this.config.sendEvents) {
      await this.client.flush();
    }
  }

  /**
   * Close LaunchDarkly client
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.flush();
      await this.client.close();
      this.connected = false;
    }
  }
}
