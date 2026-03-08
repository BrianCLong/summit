/**
 * Secrets and Key Rotation Management
 * Sprint 27D: Automated credential lifecycle with zero-downtime rotation
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface SecretConfig {
  name: string;
  type:
    | 'api_key'
    | 'certificate'
    | 'password'
    | 'signing_key'
    | 'encryption_key';
  rotationInterval: number; // seconds
  gracePeriod: number; // seconds for dual-key overlap
  autoRotate: boolean;
  destinations: string[]; // where to deploy rotated secrets
  dependencies: string[]; // services that depend on this secret
}

export interface SecretVersion {
  version: number;
  value: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'pending' | 'deprecated' | 'revoked';
  metadata: Record<string, any>;
}

export interface RotationResult {
  secretName: string;
  oldVersion: number;
  newVersion: number;
  success: boolean;
  affectedServices: string[];
  rollbackAvailable: boolean;
  errors?: string[];
}

export class SecretsManager extends EventEmitter {
  private secrets = new Map<string, SecretConfig>();
  private versions = new Map<string, SecretVersion[]>();
  private rotationSchedule = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    this.startRotationScheduler();
  }

  /**
   * Register a secret for management
   */
  registerSecret(config: SecretConfig): void {
    this.secrets.set(config.name, config);

    // Initialize with current secret if not exists
    if (!this.versions.has(config.name)) {
      this.versions.set(config.name, []);
    }

    // Schedule rotation if auto-rotate enabled
    if (config.autoRotate) {
      this.scheduleRotation(config.name);
    }

    this.emit('secret_registered', { name: config.name, config });
  }

  /**
   * Create initial secret version
   */
  createSecret(
    secretName: string,
    value: string,
    metadata: Record<string, any> = {},
  ): SecretVersion {
    const config = this.secrets.get(secretName);
    if (!config) {
      throw new Error(`Secret ${secretName} not registered`);
    }

    const versions = this.versions.get(secretName) || [];
    const version: SecretVersion = {
      version: versions.length + 1,
      value,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.rotationInterval * 1000),
      status: 'active',
      metadata,
    };

    versions.push(version);
    this.versions.set(secretName, versions);

    this.emit('secret_created', { secretName, version: version.version });
    return version;
  }

  /**
   * Rotate a secret with zero-downtime strategy
   */
  async rotateSecret(
    secretName: string,
    force = false,
  ): Promise<RotationResult> {
    const config = this.secrets.get(secretName);
    if (!config) {
      throw new Error(`Secret ${secretName} not registered`);
    }

    const versions = this.versions.get(secretName) || [];
    const currentVersion = versions.find((v) => v.status === 'active');

    if (!currentVersion) {
      throw new Error(`No active version found for secret ${secretName}`);
    }

    // Check if rotation is needed
    if (!force && currentVersion.expiresAt > new Date()) {
      return {
        secretName,
        oldVersion: currentVersion.version,
        newVersion: currentVersion.version,
        success: false,
        affectedServices: [],
        rollbackAvailable: false,
        errors: ['Rotation not needed - secret not expired'],
      };
    }

    try {
      this.emit('rotation_started', {
        secretName,
        currentVersion: currentVersion.version,
      });

      // Generate new secret
      const newSecret = this.generateSecret(config.type);
      const newVersion: SecretVersion = {
        version: currentVersion.version + 1,
        value: newSecret,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + config.rotationInterval * 1000),
        status: 'pending',
        metadata: { rotatedFrom: currentVersion.version },
      };

      versions.push(newVersion);

      // Deploy new secret to destinations
      await this.deploySecret(secretName, newVersion, config.destinations);

      // Update service configurations
      await this.updateServiceConfigurations(
        secretName,
        newVersion,
        config.dependencies,
      );

      // Activate new version
      newVersion.status = 'active';
      currentVersion.status = 'deprecated';

      // Schedule cleanup of old version after grace period
      setTimeout(() => {
        this.cleanupOldVersion(secretName, currentVersion.version);
      }, config.gracePeriod * 1000);

      const result: RotationResult = {
        secretName,
        oldVersion: currentVersion.version,
        newVersion: newVersion.version,
        success: true,
        affectedServices: config.dependencies,
        rollbackAvailable: true,
      };

      this.emit('rotation_completed', result);
      return result;
    } catch (error) {
      this.emit('rotation_failed', {
        secretName,
        error: error.message,
        version: currentVersion.version,
      });

      return {
        secretName,
        oldVersion: currentVersion.version,
        newVersion: currentVersion.version,
        success: false,
        affectedServices: [],
        rollbackAvailable: true,
        errors: [error.message],
      };
    }
  }

  /**
   * Emergency secret revocation
   */
  async revokeSecret(secretName: string, version?: number): Promise<void> {
    const versions = this.versions.get(secretName) || [];
    const config = this.secrets.get(secretName);

    if (!config) {
      throw new Error(`Secret ${secretName} not registered`);
    }

    // Revoke specific version or all active versions
    const versionsToRevoke = version
      ? versions.filter((v) => v.version === version)
      : versions.filter((v) => v.status === 'active' || v.status === 'pending');

    for (const versionToRevoke of versionsToRevoke) {
      versionToRevoke.status = 'revoked';
      await this.removeFromDestinations(
        secretName,
        versionToRevoke,
        config.destinations,
      );
    }

    // Force immediate rotation if no active versions remain
    const hasActiveVersion = versions.some((v) => v.status === 'active');
    if (!hasActiveVersion) {
      await this.rotateSecret(secretName, true);
    }

    this.emit('secret_revoked', {
      secretName,
      revokedVersions: versionsToRevoke.map((v) => v.version),
    });
  }

  /**
   * Get current active secret
   */
  getActiveSecret(secretName: string): SecretVersion | null {
    const versions = this.versions.get(secretName) || [];
    return versions.find((v) => v.status === 'active') || null;
  }

  /**
   * Get secret by version
   */
  getSecretVersion(secretName: string, version: number): SecretVersion | null {
    const versions = this.versions.get(secretName) || [];
    return versions.find((v) => v.version === version) || null;
  }

  /**
   * List all secrets with their status
   */
  listSecrets(): Array<{
    name: string;
    config: SecretConfig;
    activeVersion?: number;
    nextRotation?: Date;
    status: 'healthy' | 'expiring' | 'expired' | 'error';
  }> {
    const results: Array<any> = [];

    for (const [name, config] of this.secrets.entries()) {
      const versions = this.versions.get(name) || [];
      const activeVersion = versions.find((v) => v.status === 'active');

      let status: 'healthy' | 'expiring' | 'expired' | 'error' = 'healthy';
      let nextRotation: Date | undefined;

      if (activeVersion) {
        const timeToExpiry = activeVersion.expiresAt.getTime() - Date.now();
        const expiryThreshold = config.rotationInterval * 0.1 * 1000; // 10% of rotation interval

        if (timeToExpiry <= 0) {
          status = 'expired';
        } else if (timeToExpiry <= expiryThreshold) {
          status = 'expiring';
        }

        nextRotation = activeVersion.expiresAt;
      } else {
        status = 'error';
      }

      results.push({
        name,
        config,
        activeVersion: activeVersion?.version,
        nextRotation,
        status,
      });
    }

    return results;
  }

  /**
   * Rollback to previous secret version
   */
  async rollbackSecret(secretName: string): Promise<RotationResult> {
    const config = this.secrets.get(secretName);
    if (!config) {
      throw new Error(`Secret ${secretName} not registered`);
    }

    const versions = this.versions.get(secretName) || [];
    const currentVersion = versions.find((v) => v.status === 'active');
    const previousVersion = versions.find((v) => v.status === 'deprecated');

    if (!previousVersion) {
      throw new Error('No previous version available for rollback');
    }

    try {
      // Reactivate previous version
      previousVersion.status = 'active';
      if (currentVersion) {
        currentVersion.status = 'revoked';
      }

      // Update service configurations
      await this.updateServiceConfigurations(
        secretName,
        previousVersion,
        config.dependencies,
      );

      const result: RotationResult = {
        secretName,
        oldVersion: currentVersion?.version || 0,
        newVersion: previousVersion.version,
        success: true,
        affectedServices: config.dependencies,
        rollbackAvailable: false,
      };

      this.emit('rollback_completed', result);
      return result;
    } catch (error) {
      this.emit('rollback_failed', {
        secretName,
        error: error.message,
      });
      throw error;
    }
  }

  private generateSecret(type: SecretConfig['type']): string {
    switch (type) {
      case 'api_key':
        return 'ak_' + crypto.randomBytes(32).toString('hex');

      case 'password':
        const chars =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 32; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;

      case 'signing_key':
      case 'encryption_key':
        return crypto.randomBytes(32).toString('base64');

      case 'certificate':
        // In production, integrate with CA for certificate generation
        return this.generateSelfSignedCert();

      default:
        return crypto.randomBytes(32).toString('hex');
    }
  }

  private generateSelfSignedCert(): string {
    // Simplified certificate generation
    // In production, use proper PKI infrastructure
    return `-----BEGIN CERTIFICATE-----
${crypto.randomBytes(64).toString('base64')}
-----END CERTIFICATE-----`;
  }

  private async deploySecret(
    secretName: string,
    version: SecretVersion,
    destinations: string[],
  ): Promise<void> {
    for (const destination of destinations) {
      try {
        await this.deployToDestination(secretName, version, destination);
      } catch (error) {
        console.error(
          `Failed to deploy secret ${secretName} to ${destination}:`,
          error,
        );
        throw error;
      }
    }
  }

  private async deployToDestination(
    secretName: string,
    version: SecretVersion,
    destination: string,
  ): Promise<void> {
    // Implement deployment logic based on destination type
    switch (destination) {
      case 'kubernetes':
        await this.deployToKubernetes(secretName, version);
        break;

      case 'vault':
        await this.deployToVault(secretName, version);
        break;

      case 'aws_secrets_manager':
        await this.deployToAWSSecretsManager(secretName, version);
        break;

      default:
        console.warn(`Unknown destination: ${destination}`);
    }
  }

  private async deployToKubernetes(
    secretName: string,
    version: SecretVersion,
  ): Promise<void> {
    // Implement Kubernetes secret deployment
    console.log(`Deploying ${secretName} v${version.version} to Kubernetes`);
  }

  private async deployToVault(
    secretName: string,
    version: SecretVersion,
  ): Promise<void> {
    // Implement HashiCorp Vault deployment
    console.log(`Deploying ${secretName} v${version.version} to Vault`);
  }

  private async deployToAWSSecretsManager(
    secretName: string,
    version: SecretVersion,
  ): Promise<void> {
    // Implement AWS Secrets Manager deployment
    console.log(
      `Deploying ${secretName} v${version.version} to AWS Secrets Manager`,
    );
  }

  private async updateServiceConfigurations(
    secretName: string,
    version: SecretVersion,
    dependencies: string[],
  ): Promise<void> {
    for (const service of dependencies) {
      try {
        await this.updateServiceConfiguration(service, secretName, version);
      } catch (error) {
        console.error(`Failed to update ${service} configuration:`, error);
        throw error;
      }
    }
  }

  private async updateServiceConfiguration(
    service: string,
    secretName: string,
    version: SecretVersion,
  ): Promise<void> {
    // Implement service-specific configuration updates
    console.log(
      `Updating ${service} configuration for ${secretName} v${version.version}`,
    );
  }

  private async removeFromDestinations(
    secretName: string,
    version: SecretVersion,
    destinations: string[],
  ): Promise<void> {
    for (const destination of destinations) {
      try {
        await this.removeFromDestination(secretName, version, destination);
      } catch (error) {
        console.error(`Failed to remove secret from ${destination}:`, error);
      }
    }
  }

  private async removeFromDestination(
    secretName: string,
    version: SecretVersion,
    destination: string,
  ): Promise<void> {
    // Implement removal logic based on destination type
    console.log(
      `Removing ${secretName} v${version.version} from ${destination}`,
    );
  }

  private cleanupOldVersion(secretName: string, version: number): void {
    const versions = this.versions.get(secretName) || [];
    const versionToCleanup = versions.find((v) => v.version === version);

    if (versionToCleanup && versionToCleanup.status === 'deprecated') {
      versionToCleanup.status = 'revoked';
      this.emit('version_cleaned_up', { secretName, version });
    }
  }

  private scheduleRotation(secretName: string): void {
    const config = this.secrets.get(secretName);
    if (!config) return;

    // Clear existing schedule
    const existingSchedule = this.rotationSchedule.get(secretName);
    if (existingSchedule) {
      clearInterval(existingSchedule);
    }

    // Schedule periodic rotation
    const interval = setInterval(async () => {
      try {
        await this.rotateSecret(secretName);
      } catch (error) {
        console.error(`Scheduled rotation failed for ${secretName}:`, error);
      }
    }, config.rotationInterval * 1000);

    this.rotationSchedule.set(secretName, interval);
  }

  private startRotationScheduler(): void {
    // Check for expiring secrets every minute
    setInterval(() => {
      for (const [secretName, config] of this.secrets.entries()) {
        if (!config.autoRotate) continue;

        const activeVersion = this.getActiveSecret(secretName);
        if (!activeVersion) continue;

        const timeToExpiry = activeVersion.expiresAt.getTime() - Date.now();
        const rotationThreshold = config.rotationInterval * 0.1 * 1000; // Rotate at 10% remaining

        if (timeToExpiry <= rotationThreshold) {
          this.rotateSecret(secretName).catch((error) => {
            console.error(`Auto-rotation failed for ${secretName}:`, error);
          });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Health check for secrets management
   */
  getHealthStatus(): {
    healthy: boolean;
    totalSecrets: number;
    expiredSecrets: number;
    expiringSecrets: number;
    recentRotations: number;
  } {
    const secrets = this.listSecrets();
    const expiredSecrets = secrets.filter((s) => s.status === 'expired').length;
    const expiringSecrets = secrets.filter(
      (s) => s.status === 'expiring',
    ).length;

    // Count rotations in last 24 hours
    const recentRotations = Array.from(this.versions.values())
      .flat()
      .filter((v) => {
        const ageHours =
          (Date.now() - v.createdAt.getTime()) / (1000 * 60 * 60);
        return ageHours <= 24;
      }).length;

    return {
      healthy: expiredSecrets === 0,
      totalSecrets: secrets.length,
      expiredSecrets,
      expiringSecrets,
      recentRotations,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all scheduled rotations
    for (const interval of this.rotationSchedule.values()) {
      clearInterval(interval);
    }
    this.rotationSchedule.clear();
  }
}
