import crypto from 'crypto';
import { PluginManifest, PluginPermission } from '../types/plugin.js';

/**
 * Plugin security framework
 */
export class PluginSecurity {
  private trustedPublishers = new Set<string>();
  private blacklistedPlugins = new Set<string>();
  private permissionPolicies = new Map<PluginPermission, PermissionPolicy>();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Verify plugin signature
   */
  async verifySignature(
    pluginId: string,
    content: Buffer,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(content);
      verify.end();

      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      return false;
    }
  }

  /**
   * Scan plugin for vulnerabilities
   */
  async scanPlugin(pluginPath: string, manifest: PluginManifest): Promise<ScanResult> {
    const vulnerabilities: Vulnerability[] = [];
    const warnings: string[] = [];

    // Check if plugin is blacklisted
    if (this.blacklistedPlugins.has(manifest.id)) {
      vulnerabilities.push({
        severity: 'critical',
        type: 'blacklisted',
        message: `Plugin ${manifest.id} is blacklisted`,
        cve: undefined,
      });
    }

    // Check publisher trust
    if (!this.trustedPublishers.has(manifest.author.email || '')) {
      warnings.push(`Publisher ${manifest.author.name} is not in trusted list`);
    }

    // Scan for dangerous patterns
    const dangerousPatterns = await this.scanForDangerousPatterns(pluginPath);
    vulnerabilities.push(...dangerousPatterns);

    // Check permissions
    const permissionIssues = await this.analyzePermissions(manifest);
    warnings.push(...permissionIssues);

    // Scan dependencies for known vulnerabilities
    const depVulnerabilities = await this.scanDependencies(manifest);
    vulnerabilities.push(...depVulnerabilities);

    return {
      safe: vulnerabilities.filter(v => v.severity === 'critical').length === 0,
      vulnerabilities,
      warnings,
      scannedAt: new Date(),
    };
  }

  /**
   * Check if permission is allowed for plugin
   */
  checkPermission(
    manifest: PluginManifest,
    permission: PluginPermission,
    context: PermissionContext
  ): PermissionCheckResult {
    // Check if permission requested
    if (!manifest.permissions.includes(permission)) {
      return {
        allowed: false,
        reason: 'Permission not requested in manifest',
      };
    }

    // Get policy for permission
    const policy = this.permissionPolicies.get(permission);
    if (!policy) {
      return {
        allowed: true,
      };
    }

    // Apply policy rules
    const policyResult = policy.evaluate(manifest, context);
    if (!policyResult.allowed) {
      return policyResult;
    }

    return {
      allowed: true,
    };
  }

  /**
   * Apply resource quota enforcement
   */
  enforceResourceQuota(manifest: PluginManifest): ResourceQuota {
    const requested = manifest.resources || {
      maxMemoryMB: 256,
      maxCpuPercent: 50,
      maxStorageMB: 100,
      maxNetworkMbps: 10,
    };

    // Apply maximum limits
    const quota: ResourceQuota = {
      maxMemoryMB: Math.min(requested.maxMemoryMB, 2048),
      maxCpuPercent: Math.min(requested.maxCpuPercent, 100),
      maxStorageMB: Math.min(requested.maxStorageMB, 1024),
      maxNetworkMbps: Math.min(requested.maxNetworkMbps, 1000),
    };

    return quota;
  }

  /**
   * Add trusted publisher
   */
  addTrustedPublisher(email: string): void {
    this.trustedPublishers.add(email);
  }

  /**
   * Blacklist a plugin
   */
  blacklistPlugin(pluginId: string, reason: string): void {
    this.blacklistedPlugins.add(pluginId);
  }

  /**
   * Scan for dangerous code patterns
   */
  private async scanForDangerousPatterns(pluginPath: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Would implement static analysis here:
    // - eval() usage
    // - dynamic require()
    // - child_process usage
    // - network requests to suspicious domains
    // - file system manipulation
    // - crypto mining patterns

    return vulnerabilities;
  }

  /**
   * Analyze requested permissions
   */
  private async analyzePermissions(manifest: PluginManifest): Promise<string[]> {
    const warnings: string[] = [];

    const dangerousPermissions = [
      PluginPermission.FILE_SYSTEM,
      PluginPermission.DATABASE_ACCESS,
      PluginPermission.EXECUTE_QUERIES,
    ];

    for (const permission of manifest.permissions) {
      if (dangerousPermissions.includes(permission)) {
        warnings.push(
          `Plugin requests dangerous permission: ${permission}. Review carefully.`
        );
      }
    }

    return warnings;
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  private async scanDependencies(manifest: PluginManifest): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Would integrate with vulnerability databases like:
    // - npm audit
    // - Snyk
    // - GitHub Security Advisories

    return vulnerabilities;
  }

  /**
   * Initialize default permission policies
   */
  private initializeDefaultPolicies(): void {
    // Example: Network access requires approval for unknown publishers
    this.permissionPolicies.set(PluginPermission.NETWORK_ACCESS, {
      evaluate: (manifest, context) => {
        if (!this.trustedPublishers.has(manifest.author.email || '')) {
          return {
            allowed: false,
            reason: 'Network access requires trusted publisher for first-time plugins',
            requiresApproval: true,
          };
        }
        return { allowed: true };
      },
    });

    // File system access is restricted
    this.permissionPolicies.set(PluginPermission.FILE_SYSTEM, {
      evaluate: (manifest, context) => {
        return {
          allowed: false,
          reason: 'File system access is restricted',
          requiresApproval: true,
        };
      },
    });
  }
}

export interface ScanResult {
  safe: boolean;
  vulnerabilities: Vulnerability[];
  warnings: string[];
  scannedAt: Date;
}

export interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  cve?: string;
}

export interface PermissionPolicy {
  evaluate: (manifest: PluginManifest, context: PermissionContext) => PermissionCheckResult;
}

export interface PermissionContext {
  userId?: string;
  tenantId?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export interface ResourceQuota {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxStorageMB: number;
  maxNetworkMbps: number;
}
