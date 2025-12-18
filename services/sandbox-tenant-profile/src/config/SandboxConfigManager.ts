import { v4 as uuidv4 } from 'uuid';
import {
  SandboxTenantProfile,
  SandboxTenantProfileSchema,
  CreateSandboxRequest,
  UpdateSandboxRequest,
  SandboxIsolationLevel,
  SandboxStatus,
  TenantType,
  DataAccessMode,
  SandboxResourceQuota,
  DataAccessPolicy,
  ConnectorRestriction,
  UIIndicatorConfig,
  AuditConfig,
  IntegrationRestrictions,
  getDefaultConnectorRestrictions,
  SandboxErrorCode,
  SandboxError,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SandboxConfigManager');

/**
 * Preset configurations for common sandbox use cases
 */
export const SANDBOX_PRESETS = {
  /**
   * Data Lab preset for data science and analytics work
   */
  dataLab: {
    isolationLevel: SandboxIsolationLevel.ENHANCED,
    tenantType: TenantType.DATALAB,
    resourceQuotas: {
      maxCpuMs: 60000,
      maxMemoryMb: 2048,
      maxStorageGb: 20,
      maxExecutionsPerHour: 500,
      maxConcurrentSandboxes: 10,
      maxDataExportMb: 100,
      maxNetworkBytesPerHour: 0,
    } as SandboxResourceQuota,
    dataAccessPolicy: {
      mode: DataAccessMode.SYNTHETIC_ONLY,
      maxRecords: 100000,
      piiHandling: 'synthetic' as const,
      allowLinkbackToProduction: false,
      requireAnonymizationAudit: true,
      retentionDays: 30,
    } as Partial<DataAccessPolicy>,
  },

  /**
   * Research preset for academic and experimental work
   */
  research: {
    isolationLevel: SandboxIsolationLevel.RESEARCH,
    tenantType: TenantType.SANDBOX,
    resourceQuotas: {
      maxCpuMs: 120000,
      maxMemoryMb: 4096,
      maxStorageGb: 50,
      maxExecutionsPerHour: 1000,
      maxConcurrentSandboxes: 20,
      maxDataExportMb: 0, // No exports
      maxNetworkBytesPerHour: 0,
    } as SandboxResourceQuota,
    dataAccessPolicy: {
      mode: DataAccessMode.ANONYMIZED,
      maxRecords: 50000,
      piiHandling: 'redact' as const,
      allowLinkbackToProduction: false,
      requireAnonymizationAudit: true,
      retentionDays: 90,
    } as Partial<DataAccessPolicy>,
  },

  /**
   * Demo preset for demonstrations and POCs
   */
  demo: {
    isolationLevel: SandboxIsolationLevel.STANDARD,
    tenantType: TenantType.SANDBOX,
    resourceQuotas: {
      maxCpuMs: 30000,
      maxMemoryMb: 512,
      maxStorageGb: 5,
      maxExecutionsPerHour: 100,
      maxConcurrentSandboxes: 3,
      maxDataExportMb: 0,
      maxNetworkBytesPerHour: 0,
    } as SandboxResourceQuota,
    dataAccessPolicy: {
      mode: DataAccessMode.SYNTHETIC_ONLY,
      maxRecords: 1000,
      piiHandling: 'block' as const,
      allowLinkbackToProduction: false,
      requireAnonymizationAudit: false,
      retentionDays: 7,
    } as Partial<DataAccessPolicy>,
  },

  /**
   * Training preset for onboarding and education
   */
  training: {
    isolationLevel: SandboxIsolationLevel.STANDARD,
    tenantType: TenantType.SANDBOX,
    resourceQuotas: {
      maxCpuMs: 15000,
      maxMemoryMb: 256,
      maxStorageGb: 2,
      maxExecutionsPerHour: 50,
      maxConcurrentSandboxes: 1,
      maxDataExportMb: 0,
      maxNetworkBytesPerHour: 0,
    } as SandboxResourceQuota,
    dataAccessPolicy: {
      mode: DataAccessMode.SYNTHETIC_ONLY,
      maxRecords: 500,
      piiHandling: 'block' as const,
      allowLinkbackToProduction: false,
      requireAnonymizationAudit: false,
      retentionDays: 14,
    } as Partial<DataAccessPolicy>,
  },

  /**
   * Airgapped preset for high-security environments
   */
  airgapped: {
    isolationLevel: SandboxIsolationLevel.AIRGAPPED,
    tenantType: TenantType.SANDBOX,
    resourceQuotas: {
      maxCpuMs: 10000,
      maxMemoryMb: 256,
      maxStorageGb: 1,
      maxExecutionsPerHour: 50,
      maxConcurrentSandboxes: 1,
      maxDataExportMb: 0,
      maxNetworkBytesPerHour: 0,
    } as SandboxResourceQuota,
    dataAccessPolicy: {
      mode: DataAccessMode.STRUCTURE_ONLY,
      maxRecords: 0,
      piiHandling: 'block' as const,
      allowLinkbackToProduction: false,
      requireAnonymizationAudit: true,
      retentionDays: 7,
    } as Partial<DataAccessPolicy>,
  },
} as const;

export type SandboxPreset = keyof typeof SANDBOX_PRESETS;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SandboxConfigManager handles creation, validation, and management
 * of sandbox tenant profiles with production-grade safety.
 */
export class SandboxConfigManager {
  private profiles: Map<string, SandboxTenantProfile> = new Map();

  /**
   * Create a new sandbox tenant profile
   */
  async createProfile(
    request: CreateSandboxRequest,
    ownerId: string,
    preset?: SandboxPreset
  ): Promise<SandboxTenantProfile> {
    const now = new Date();
    const id = uuidv4();

    // Get preset configuration if specified
    const presetConfig = preset ? SANDBOX_PRESETS[preset] : undefined;

    // Calculate expiration
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + request.expiresInDays);

    // Determine isolation level
    const isolationLevel =
      request.isolationLevel ||
      presetConfig?.isolationLevel ||
      SandboxIsolationLevel.ENHANCED;

    // Build the profile
    const profile: SandboxTenantProfile = SandboxTenantProfileSchema.parse({
      id,
      name: request.name,
      description: request.description,
      tenantType: presetConfig?.tenantType || TenantType.SANDBOX,
      parentTenantId: request.parentTenantId,
      ownerId,
      teamIds: request.teamIds || [],
      allowedUserIds: [ownerId],
      isolationLevel,
      resourceQuotas: {
        ...presetConfig?.resourceQuotas,
        ...request.resourceQuotas,
      },
      dataAccessPolicy: {
        ...presetConfig?.dataAccessPolicy,
        ...request.dataAccessPolicy,
      },
      connectorRestrictions: getDefaultConnectorRestrictions(isolationLevel),
      uiIndicators: this.getDefaultUIIndicators(isolationLevel),
      auditConfig: this.getDefaultAuditConfig(isolationLevel),
      integrationRestrictions: this.getDefaultIntegrationRestrictions(isolationLevel),
      status: SandboxStatus.PROVISIONING,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      tags: request.tags || [],
      metadata: {},
    });

    // Validate the complete profile
    const validation = this.validateProfile(profile);
    if (!validation.valid) {
      const error: SandboxError = {
        code: SandboxErrorCode.INVALID_CONFIGURATION,
        message: `Invalid sandbox configuration: ${validation.errors.join(', ')}`,
        sandboxId: id,
        userId: ownerId,
        operation: 'createProfile',
        details: { errors: validation.errors, warnings: validation.warnings },
        timestamp: now,
      };
      throw error;
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      logger.warn('Sandbox configuration warnings', {
        sandboxId: id,
        warnings: validation.warnings,
      });
    }

    // Store the profile
    this.profiles.set(id, profile);

    logger.info('Created sandbox profile', {
      sandboxId: id,
      name: profile.name,
      isolationLevel: profile.isolationLevel,
      ownerId,
    });

    return profile;
  }

  /**
   * Get a sandbox profile by ID
   */
  async getProfile(sandboxId: string): Promise<SandboxTenantProfile | null> {
    return this.profiles.get(sandboxId) || null;
  }

  /**
   * Update a sandbox profile
   */
  async updateProfile(
    sandboxId: string,
    request: UpdateSandboxRequest,
    userId: string
  ): Promise<SandboxTenantProfile> {
    const existing = this.profiles.get(sandboxId);
    if (!existing) {
      throw {
        code: SandboxErrorCode.ACCESS_DENIED,
        message: `Sandbox not found: ${sandboxId}`,
        sandboxId,
        userId,
        operation: 'updateProfile',
        timestamp: new Date(),
      } as SandboxError;
    }

    // Merge updates
    const updated: SandboxTenantProfile = {
      ...existing,
      ...request,
      resourceQuotas: {
        ...existing.resourceQuotas,
        ...request.resourceQuotas,
      },
      dataAccessPolicy: {
        ...existing.dataAccessPolicy,
        ...request.dataAccessPolicy,
      },
      uiIndicators: {
        ...existing.uiIndicators,
        ...request.uiIndicators,
      },
      updatedAt: new Date(),
    };

    // Validate
    const validation = this.validateProfile(updated);
    if (!validation.valid) {
      throw {
        code: SandboxErrorCode.INVALID_CONFIGURATION,
        message: `Invalid update: ${validation.errors.join(', ')}`,
        sandboxId,
        userId,
        operation: 'updateProfile',
        details: { errors: validation.errors },
        timestamp: new Date(),
      } as SandboxError;
    }

    this.profiles.set(sandboxId, updated);

    logger.info('Updated sandbox profile', { sandboxId, userId });

    return updated;
  }

  /**
   * Activate a sandbox after provisioning
   */
  async activateProfile(sandboxId: string): Promise<SandboxTenantProfile> {
    const profile = this.profiles.get(sandboxId);
    if (!profile) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    if (profile.status !== SandboxStatus.PROVISIONING) {
      throw new Error(`Cannot activate sandbox in status: ${profile.status}`);
    }

    const updated: SandboxTenantProfile = {
      ...profile,
      status: SandboxStatus.ACTIVE,
      updatedAt: new Date(),
    };

    this.profiles.set(sandboxId, updated);

    logger.info('Activated sandbox', { sandboxId });

    return updated;
  }

  /**
   * Suspend a sandbox
   */
  async suspendProfile(
    sandboxId: string,
    reason: string
  ): Promise<SandboxTenantProfile> {
    const profile = this.profiles.get(sandboxId);
    if (!profile) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    const updated: SandboxTenantProfile = {
      ...profile,
      status: SandboxStatus.SUSPENDED,
      updatedAt: new Date(),
      metadata: {
        ...profile.metadata,
        suspendReason: reason,
        suspendedAt: new Date().toISOString(),
      },
    };

    this.profiles.set(sandboxId, updated);

    logger.warn('Suspended sandbox', { sandboxId, reason });

    return updated;
  }

  /**
   * Archive a sandbox
   */
  async archiveProfile(sandboxId: string): Promise<SandboxTenantProfile> {
    const profile = this.profiles.get(sandboxId);
    if (!profile) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    const updated: SandboxTenantProfile = {
      ...profile,
      status: SandboxStatus.ARCHIVED,
      updatedAt: new Date(),
      metadata: {
        ...profile.metadata,
        archivedAt: new Date().toISOString(),
      },
    };

    this.profiles.set(sandboxId, updated);

    logger.info('Archived sandbox', { sandboxId });

    return updated;
  }

  /**
   * Check if a sandbox is expired
   */
  isExpired(profile: SandboxTenantProfile): boolean {
    if (!profile.expiresAt) return false;
    return new Date() > profile.expiresAt;
  }

  /**
   * Validate a sandbox profile configuration
   */
  validateProfile(profile: SandboxTenantProfile): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate isolation level constraints
    if (profile.isolationLevel === SandboxIsolationLevel.AIRGAPPED) {
      // Airgapped must have network disabled
      if (profile.resourceQuotas.maxNetworkBytesPerHour > 0) {
        errors.push('Airgapped sandbox cannot have network access');
      }
      // Airgapped should not allow external services
      const hasExternalService = profile.connectorRestrictions.some(
        c => c.connectorType === 'external_service' && c.allowed
      );
      if (hasExternalService) {
        errors.push('Airgapped sandbox cannot use external services');
      }
    }

    // Validate data access policy
    if (profile.dataAccessPolicy.allowLinkbackToProduction) {
      errors.push('Sandbox cannot allow linkback to production');
    }

    if (
      profile.dataAccessPolicy.mode !== DataAccessMode.SYNTHETIC_ONLY &&
      profile.dataAccessPolicy.piiHandling === 'block'
    ) {
      warnings.push(
        'Non-synthetic data mode with PII blocking may severely limit data access'
      );
    }

    // Validate integration restrictions
    if (profile.integrationRestrictions.allowFederation) {
      errors.push('Sandbox cannot enable federation');
    }

    if (profile.integrationRestrictions.allowExternalExports) {
      if (profile.isolationLevel !== SandboxIsolationLevel.STANDARD) {
        errors.push('External exports only allowed in standard isolation');
      } else {
        warnings.push('External exports enabled - ensure proper data governance');
      }
    }

    // Validate resource quotas
    if (profile.resourceQuotas.maxDataExportMb > 0) {
      if (profile.dataAccessPolicy.mode === DataAccessMode.ANONYMIZED) {
        warnings.push('Data export enabled with anonymized data - review carefully');
      }
    }

    // Validate expiration
    if (profile.expiresAt) {
      const maxExpiry = new Date();
      maxExpiry.setFullYear(maxExpiry.getFullYear() + 1);
      if (profile.expiresAt > maxExpiry) {
        errors.push('Sandbox expiration cannot exceed 1 year');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * List all sandbox profiles for a user
   */
  async listProfiles(
    userId: string,
    options?: { status?: SandboxStatus; includeExpired?: boolean }
  ): Promise<SandboxTenantProfile[]> {
    const results: SandboxTenantProfile[] = [];

    for (const profile of this.profiles.values()) {
      // Check ownership or team membership
      if (
        profile.ownerId !== userId &&
        !profile.allowedUserIds.includes(userId) &&
        !profile.teamIds.some(teamId => this.userInTeam(userId, teamId))
      ) {
        continue;
      }

      // Filter by status
      if (options?.status && profile.status !== options.status) {
        continue;
      }

      // Filter expired
      if (!options?.includeExpired && this.isExpired(profile)) {
        continue;
      }

      results.push(profile);
    }

    return results;
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): { name: SandboxPreset; description: string }[] {
    return [
      { name: 'dataLab', description: 'Data science and analytics work with synthetic data' },
      { name: 'research', description: 'Academic and experimental research with anonymized data' },
      { name: 'demo', description: 'Demonstrations and proof-of-concept work' },
      { name: 'training', description: 'Onboarding and educational purposes' },
      { name: 'airgapped', description: 'High-security isolated environment' },
    ];
  }

  // Private helper methods

  private getDefaultUIIndicators(level: SandboxIsolationLevel): UIIndicatorConfig {
    const base: UIIndicatorConfig = {
      mode: 'full' as const,
      bannerText: 'SANDBOX ENVIRONMENT - NOT PRODUCTION',
      bannerColor: '#FF6B35',
      watermarkText: 'SANDBOX',
      watermarkOpacity: 0.1,
      showDataSourceWarning: true,
      confirmBeforeExport: true,
    };

    switch (level) {
      case SandboxIsolationLevel.AIRGAPPED:
        return {
          ...base,
          bannerText: 'AIRGAPPED SANDBOX - NO EXTERNAL ACCESS',
          bannerColor: '#DC2626',
          watermarkOpacity: 0.15,
        };
      case SandboxIsolationLevel.RESEARCH:
        return {
          ...base,
          bannerText: 'RESEARCH SANDBOX - ANONYMIZED DATA',
          bannerColor: '#7C3AED',
        };
      default:
        return base;
    }
  }

  private getDefaultAuditConfig(level: SandboxIsolationLevel): AuditConfig {
    return {
      logAllQueries: true,
      logAllMutations: true,
      logDataAccess: true,
      logExportAttempts: true,
      logLinkbackAttempts: true,
      alertOnSuspiciousActivity: level !== SandboxIsolationLevel.STANDARD,
      retainAuditLogsDays: level === SandboxIsolationLevel.AIRGAPPED ? 365 : 90,
      exportAuditFormat: 'json',
    };
  }

  private getDefaultIntegrationRestrictions(
    level: SandboxIsolationLevel
  ): IntegrationRestrictions {
    return {
      allowFederation: false,
      allowExternalExports: false,
      allowWebhooks: level === SandboxIsolationLevel.STANDARD,
      allowApiKeys: level === SandboxIsolationLevel.STANDARD,
      allowedIntegrations: [],
      blockedIntegrations: ['*'],
      maxExternalCalls: 0,
    };
  }

  private userInTeam(userId: string, teamId: string): boolean {
    // In production, this would check team membership from a user service
    // For now, return false as a safe default
    return false;
  }
}

/**
 * Singleton instance
 */
let configManagerInstance: SandboxConfigManager | null = null;

export function getSandboxConfigManager(): SandboxConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new SandboxConfigManager();
  }
  return configManagerInstance;
}
