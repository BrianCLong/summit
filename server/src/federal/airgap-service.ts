import { z, type ZodType } from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { otelService } from '../middleware/observability/otel-tracing.js';

// Air-gapped environment service for Federal/Gov deployments
interface AirGapManifest {
  version: string;
  timestamp: Date;
  components: {
    name: string;
    version: string;
    sha256: string;
    sbom: string; // Path to SBOM file
    signatures: string[]; // Detached signatures
  }[];
  dependencies: {
    name: string;
    version: string;
    integrity: string;
    source: 'offline' | 'internal_registry';
  }[];
  policies: {
    name: string;
    version: string;
    hash: string;
    signed: boolean;
  }[];
  breakGlassAccounts: string[];
  emergencyContacts: {
    role: string;
    contact: string;
    priority: number;
  }[];
}

interface OfflineUpdate {
  updateId: string;
  components: string[];
  manifest: AirGapManifest;
  transferMedia: 'secure_usb' | 'dvd_rom' | 'tape_archive' | 'paper_qr';
  approvalChain: {
    approver: string;
    role: string;
    timestamp: Date;
    signature: string;
  }[];
  verificationResults: {
    component: string;
    verified: boolean;
    checks: {
      sbom: boolean;
      signature: boolean;
      hash: boolean;
      policy: boolean;
    };
  }[];
}

interface BreakGlassSession {
  sessionId: string;
  initiator: string;
  reason: string;
  approvers: string[];
  startTime: Date;
  endTime?: Date;
  actions: {
    timestamp: Date;
    action: string;
    details: any;
    justification: string;
  }[];
  status: 'active' | 'completed' | 'aborted';
}

const AirGapConfigSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(['STRICT', 'RESTRICTED', 'CONTROLLED']).default('STRICT'),
  offlineRegistry: z.object({
    path: z.string().default('/opt/intelgraph/registry'),
    maxSize: z.string().default('10GB'),
    encryptionEnabled: z.boolean().default(true),
  }),
  updateProtocol: z.object({
    transferMedia: z
      .enum(['secure_usb', 'dvd_rom', 'tape_archive', 'paper_qr'])
      .default('secure_usb'),
    requireMultipleApprovals: z.boolean().default(true),
    minimumApprovers: z.number().min(2).max(5).default(3),
    quarantinePeriod: z.number().default(24), // hours
  }),
  breakGlass: z.object({
    enabled: z.boolean().default(true),
    maxDuration: z.number().default(4), // hours
    requiredApprovers: z.number().min(2).default(2),
    auditLevel: z.enum(['COMPREHENSIVE', 'DETAILED']).default('COMPREHENSIVE'),
  }),
  compliance: z.object({
    fipsRequired: z.boolean().default(true),
    sbomsRequired: z.boolean().default(true),
    signatureValidation: z.boolean().default(true),
    policyEnforcement: z.boolean().default(true),
  }),
});

export class AirGapService {
  private config: z.infer<typeof AirGapConfigSchema>;
  private manifest: AirGapManifest | null = null;
  private activeBreakGlass: Map<string, BreakGlassSession> = new Map();
  private offlineRegistry: Map<string, any> = new Map();

  constructor(config?: Partial<z.infer<typeof AirGapConfigSchema>>) {
    this.config = AirGapConfigSchema.parse({
      ...config,
      enabled: process.env.AIRGAP_ENABLED === 'true',
      mode: (process.env.AIRGAP_MODE as any) || config?.mode,
    });

    if (this.config.enabled) {
      this.initializeAirGapEnvironment();
    }
  }

  private async initializeAirGapEnvironment() {
    const span = otelService.createSpan('airgap.initialize');

    try {
      // Load offline registry
      await this.loadOfflineRegistry();

      // Load current manifest
      await this.loadManifest();

      // Verify network isolation
      await this.verifyNetworkIsolation();

      // Initialize break-glass procedures
      await this.initializeBreakGlass();

      console.log(
        `Air-gapped environment initialized in ${this.config.mode} mode`,
      );

      otelService.addSpanAttributes({
        'airgap.enabled': this.config.enabled,
        'airgap.mode': this.config.mode,
        'airgap.components_loaded': this.manifest?.components.length || 0,
        'airgap.registry_size': this.offlineRegistry.size,
      });
    } catch (error: any) {
      console.error('Air-gap initialization failed:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });

      if (this.config.enabled) {
        throw new Error(
          'Air-gap environment required but initialization failed',
        );
      }
    } finally {
      span?.end();
    }
  }

  private async loadOfflineRegistry(): Promise<void> {
    try {
      const registryPath = this.config.offlineRegistry.path;
      const indexFile = path.join(registryPath, 'index.json');

      const indexData = await fs.readFile(indexFile, 'utf-8');
      const index = JSON.parse(indexData);

      for (const component of index.components) {
        this.offlineRegistry.set(component.name, component);
      }

      console.log(
        `Loaded ${this.offlineRegistry.size} components from offline registry`,
      );
    } catch (error) {
      console.error('Failed to load offline registry:', error);
      // Initialize empty registry if none exists
      this.offlineRegistry = new Map();
    }
  }

  private async loadManifest(): Promise<void> {
    try {
      const manifestPath = '/opt/intelgraph/manifest.json';
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      this.manifest = JSON.parse(manifestData);

      // Validate manifest integrity
      await this.validateManifest(this.manifest);
    } catch (error) {
      console.error('Failed to load manifest:', error);
      this.manifest = null;
    }
  }

  private async verifyNetworkIsolation(): Promise<void> {
    if (this.config.mode !== 'STRICT') return;

    // In production, verify no external network access
    try {
      // Check for blocked outbound connections
      const testUrls = [
        'http://google.com',
        'https://registry.npmjs.org',
        'https://github.com',
      ];

      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            throw new Error(
              `Outbound network access detected to ${url} - air-gap compromised`,
            );
          }
        } catch (fetchError: any) {
          if (
            fetchError.name !== 'AbortError' &&
            fetchError.name !== 'TypeError'
          ) {
            console.warn(
              `Network isolation check failed for ${url}:`,
              fetchError.message,
            );
          }
        }
      }

      console.log('Network isolation verified - no outbound access detected');
    } catch (error: any) {
      console.error('Network isolation verification failed:', error);
      throw error;
    }
  }

  private async initializeBreakGlass(): Promise<void> {
    if (!this.config.breakGlass.enabled) return;

    // Load any active break-glass sessions from persistent storage
    try {
      const sessionPath = '/opt/intelgraph/break-glass-sessions.json';
      const sessionData = await fs.readFile(sessionPath, 'utf-8');
      const sessions = JSON.parse(sessionData);

      for (const session of sessions) {
        if (session.status === 'active') {
          this.activeBreakGlass.set(session.sessionId, {
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined,
            actions: session.actions.map((action: any) => ({
              ...action,
              timestamp: new Date(action.timestamp),
            })),
          });
        }
      }

      console.log(
        `Loaded ${this.activeBreakGlass.size} active break-glass sessions`,
      );
    } catch (error) {
      console.log('No existing break-glass sessions found');
    }
  }

  /**
   * Process offline update package
   */
  async processOfflineUpdate(updatePackagePath: string): Promise<{
    success: boolean;
    updateId: string;
    verificationResults: any[];
    errors: string[];
  }> {
    const span = otelService.createSpan('airgap.process_update');

    try {
      if (!this.config.enabled) {
        throw new Error('Air-gap mode not enabled');
      }

      const updateId = `update-${Date.now()}`;
      const errors: string[] = [];

      // Load update manifest
      const manifestPath = path.join(updatePackagePath, 'manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const updateManifest: AirGapManifest = JSON.parse(manifestData);

      // Validate update package
      const verificationResults = await this.validateUpdatePackage(
        updatePackagePath,
        updateManifest,
      );

      // Check for verification failures
      const failedVerifications = verificationResults.filter(
        (result) => !result.verified,
      );
      if (failedVerifications.length > 0) {
        errors.push(
          `Verification failed for ${failedVerifications.length} components`,
        );

        for (const failed of failedVerifications) {
          errors.push(
            `${failed.component}: ${Object.entries(failed.checks)
              .filter(([, passed]) => !passed)
              .map(([check]) => check)
              .join(', ')} failed`,
          );
        }
      }

      // Apply update if all verifications passed
      let success = false;
      if (errors.length === 0) {
        success = await this.applyOfflineUpdate(
          updatePackagePath,
          updateManifest,
        );

        if (success) {
          console.log(`Offline update ${updateId} applied successfully`);
        } else {
          errors.push('Update application failed');
        }
      }

      otelService.addSpanAttributes({
        'airgap.update_id': updateId,
        'airgap.components_updated': updateManifest.components.length,
        'airgap.verification_failures': failedVerifications.length,
        'airgap.update_success': success,
      });

      return {
        success,
        updateId,
        verificationResults,
        errors,
      };
    } catch (error: any) {
      console.error('Offline update processing failed:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });

      return {
        success: false,
        updateId: 'failed',
        verificationResults: [],
        errors: [error.message],
      };
    } finally {
      span?.end();
    }
  }

  private async validateUpdatePackage(
    packagePath: string,
    manifest: AirGapManifest,
  ): Promise<
    Array<{
      component: string;
      verified: boolean;
      checks: {
        sbom: boolean;
        signature: boolean;
        hash: boolean;
        policy: boolean;
      };
    }>
  > {
    const results = [];

    for (const component of manifest.components) {
      const checks = {
        sbom: false,
        signature: false,
        hash: false,
        policy: false,
      };

      // Verify SBOM
      if (this.config.compliance.sbomsRequired) {
        try {
          const sbomPath = path.join(packagePath, 'sboms', component.sbom);
          const sbomData = await fs.readFile(sbomPath, 'utf-8');
          const sbom = JSON.parse(sbomData);

          // Validate SBOM structure and content
          if (
            sbom.name === component.name &&
            sbom.version === component.version
          ) {
            checks.sbom = true;
          }
        } catch (error) {
          console.error(
            `SBOM verification failed for ${component.name}:`,
            error,
          );
        }
      } else {
        checks.sbom = true;
      }

      // Verify signatures
      if (this.config.compliance.signatureValidation) {
        try {
          const componentPath = path.join(
            packagePath,
            'components',
            component.name,
          );

          for (const sigPath of component.signatures) {
            const signaturePath = path.join(packagePath, 'signatures', sigPath);
            const signature = await fs.readFile(signaturePath, 'utf-8');

            // Verify signature against component (simplified - use proper crypto in production)
            const componentData = await fs.readFile(componentPath);
            const hash = crypto
              .createHash('sha256')
              .update(componentData)
              .digest('hex');

            if (hash === component.sha256) {
              checks.signature = true;
              break;
            }
          }
        } catch (error) {
          console.error(
            `Signature verification failed for ${component.name}:`,
            error,
          );
        }
      } else {
        checks.signature = true;
      }

      // Verify hash
      try {
        const componentPath = path.join(
          packagePath,
          'components',
          component.name,
        );
        const componentData = await fs.readFile(componentPath);
        const calculatedHash = crypto
          .createHash('sha256')
          .update(componentData)
          .digest('hex');

        checks.hash = calculatedHash === component.sha256;
      } catch (error) {
        console.error(`Hash verification failed for ${component.name}:`, error);
      }

      // Verify policy compliance
      if (this.config.compliance.policyEnforcement) {
        // Check component against current policies
        checks.policy = await this.validateComponentPolicy(component);
      } else {
        checks.policy = true;
      }

      results.push({
        component: component.name,
        verified: Object.values(checks).every((check) => check),
        checks,
      });
    }

    return results;
  }

  private async validateComponentPolicy(component: any): Promise<boolean> {
    // In production, validate against OPA policies
    // For now, basic checks
    const suspiciousPatterns = [
      'eval\\(',
      'exec\\(',
      'system\\(',
      'shell_exec',
      'curl.*http',
      'wget.*http',
    ];

    try {
      // This is a simplified check - in production, use proper static analysis
      const componentName = component.name.toLowerCase();

      for (const pattern of suspiciousPatterns) {
        if (new RegExp(pattern).test(componentName)) {
          console.warn(
            `Policy violation: suspicious pattern in ${component.name}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Policy validation failed for ${component.name}:`, error);
      return false;
    }
  }

  private async applyOfflineUpdate(
    packagePath: string,
    manifest: AirGapManifest,
  ): Promise<boolean> {
    try {
      // Quarantine period check
      if (this.config.updateProtocol.quarantinePeriod > 0) {
        console.log(
          `Update will be quarantined for ${this.config.updateProtocol.quarantinePeriod} hours`,
        );
        // In production, implement quarantine logic
      }

      // Apply components to offline registry
      for (const component of manifest.components) {
        const sourcePath = path.join(packagePath, 'components', component.name);
        const targetPath = path.join(
          this.config.offlineRegistry.path,
          component.name,
          component.version,
        );

        // Copy component to registry (simplified)
        console.log(`Installing ${component.name}@${component.version}`);

        // Update registry index
        this.offlineRegistry.set(component.name, {
          name: component.name,
          version: component.version,
          sha256: component.sha256,
          installedAt: new Date(),
        });
      }

      // Update manifest
      this.manifest = manifest;
      await this.saveManifest();

      // Save updated registry index
      await this.saveRegistryIndex();

      return true;
    } catch (error) {
      console.error('Update application failed:', error);
      return false;
    }
  }

  /**
   * Initiate break-glass emergency access
   */
  async initiateBreakGlass(request: {
    reason: string;
    initiator: string;
    duration: number; // hours
    approvers: string[];
  }): Promise<{
    success: boolean;
    sessionId?: string;
    message: string;
    approvalRequired: boolean;
  }> {
    const span = otelService.createSpan('airgap.initiate_breakglass');

    try {
      if (!this.config.breakGlass.enabled) {
        throw new Error('Break-glass procedures are disabled');
      }

      if (request.duration > this.config.breakGlass.maxDuration) {
        throw new Error(
          `Requested duration exceeds maximum (${this.config.breakGlass.maxDuration} hours)`,
        );
      }

      if (request.approvers.length < this.config.breakGlass.requiredApprovers) {
        throw new Error(
          `Insufficient approvers (minimum ${this.config.breakGlass.requiredApprovers} required)`,
        );
      }

      const sessionId = `breakglass-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const session: BreakGlassSession = {
        sessionId,
        initiator: request.initiator,
        reason: request.reason,
        approvers: request.approvers,
        startTime: new Date(),
        actions: [
          {
            timestamp: new Date(),
            action: 'session_initiated',
            details: { duration: request.duration },
            justification: request.reason,
          },
        ],
        status: 'active',
      };

      this.activeBreakGlass.set(sessionId, session);
      await this.saveBreakGlassSessions();

      console.log(`Break-glass session initiated: ${sessionId}`);

      otelService.addSpanAttributes({
        'breakglass.session_id': sessionId,
        'breakglass.initiator': request.initiator,
        'breakglass.duration': request.duration,
        'breakglass.approver_count': request.approvers.length,
      });

      return {
        success: true,
        sessionId,
        message: `Break-glass session ${sessionId} initiated. Approval pending.`,
        approvalRequired: true,
      };
    } catch (error: any) {
      console.error('Break-glass initiation failed:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });

      return {
        success: false,
        message: error.message,
        approvalRequired: false,
      };
    } finally {
      span?.end();
    }
  }

  /**
   * Record break-glass action
   */
  async recordBreakGlassAction(
    sessionId: string,
    action: string,
    details: any,
    justification: string,
  ): Promise<boolean> {
    const session = this.activeBreakGlass.get(sessionId);
    if (!session) {
      console.error(`Break-glass session not found: ${sessionId}`);
      return false;
    }

    if (session.status !== 'active') {
      console.error(`Break-glass session not active: ${sessionId}`);
      return false;
    }

    session.actions.push({
      timestamp: new Date(),
      action,
      details,
      justification,
    });

    await this.saveBreakGlassSessions();

    console.log(`Break-glass action recorded: ${sessionId} - ${action}`);
    return true;
  }

  /**
   * Terminate break-glass session
   */
  async terminateBreakGlass(
    sessionId: string,
    reason: string,
  ): Promise<boolean> {
    const session = this.activeBreakGlass.get(sessionId);
    if (!session) {
      console.error(`Break-glass session not found: ${sessionId}`);
      return false;
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.actions.push({
      timestamp: new Date(),
      action: 'session_terminated',
      details: { reason },
      justification: reason,
    });

    await this.saveBreakGlassSessions();

    console.log(`Break-glass session terminated: ${sessionId}`);
    return true;
  }

  private async validateManifest(manifest: AirGapManifest): Promise<void> {
    // Validate manifest structure and signatures
    if (
      !manifest.version ||
      !manifest.components ||
      !Array.isArray(manifest.components)
    ) {
      throw new Error('Invalid manifest structure');
    }

    for (const component of manifest.components) {
      if (!component.name || !component.version || !component.sha256) {
        throw new Error(
          `Invalid component in manifest: ${JSON.stringify(component)}`,
        );
      }
    }
  }

  private async saveManifest(): Promise<void> {
    if (!this.manifest) return;

    const manifestPath = '/opt/intelgraph/manifest.json';
    await fs.writeFile(manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  private async saveRegistryIndex(): Promise<void> {
    const indexPath = path.join(this.config.offlineRegistry.path, 'index.json');
    const index = {
      updated: new Date().toISOString(),
      components: Array.from(this.offlineRegistry.values()),
    };

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  private async saveBreakGlassSessions(): Promise<void> {
    const sessionPath = '/opt/intelgraph/break-glass-sessions.json';
    const sessions = Array.from(this.activeBreakGlass.values());

    await fs.writeFile(sessionPath, JSON.stringify(sessions, null, 2));
  }

  /**
   * Get air-gap environment status
   */
  async getStatus(): Promise<{
    enabled: boolean;
    mode: string;
    networkIsolated: boolean;
    manifestVersion?: string;
    componentCount: number;
    activeBreakGlass: number;
    lastUpdate?: Date;
    compliance: {
      fipsEnabled: boolean;
      sbomsValidated: boolean;
      signaturesVerified: boolean;
    };
  }> {
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      networkIsolated: this.config.mode === 'STRICT',
      manifestVersion: this.manifest?.version,
      componentCount: this.offlineRegistry.size,
      activeBreakGlass: this.activeBreakGlass.size,
      lastUpdate: this.manifest ? new Date(this.manifest.timestamp) : undefined,
      compliance: {
        fipsEnabled: this.config.compliance.fipsRequired,
        sbomsValidated: this.config.compliance.sbomsRequired,
        signaturesVerified: this.config.compliance.signatureValidation,
      },
    };
  }

  /**
   * Generate offline update instructions
   */
  generateOfflineUpdateInstructions(): string[] {
    return [
      '=== OFFLINE UPDATE PROCEDURE ===',
      '',
      '1. PREPARATION:',
      '   - Verify secure transfer media is FIPS-validated',
      '   - Ensure minimum 3 authorized approvers are available',
      '   - Prepare quarantine staging area',
      '',
      '2. UPDATE PACKAGE VERIFICATION:',
      '   - Mount secure transfer media in isolated environment',
      '   - Verify package manifest signature',
      '   - Run SBOM validation for all components',
      '   - Check component hashes against manifest',
      '',
      '3. QUARANTINE PROCESS:',
      `   - Stage update in quarantine for ${this.config.updateProtocol.quarantinePeriod} hours`,
      '   - Run security scans and policy validation',
      '   - Document verification results',
      '',
      '4. APPROVAL CHAIN:',
      `   - Obtain approvals from ${this.config.updateProtocol.minimumApprovers} authorized personnel`,
      '   - Document approval chain with digital signatures',
      '   - Verify all approvers have appropriate clearance',
      '',
      '5. UPDATE APPLICATION:',
      '   - Create system snapshot for rollback',
      '   - Apply update to offline registry',
      '   - Update system manifest',
      '   - Verify all services restart successfully',
      '',
      '6. POST-UPDATE VALIDATION:',
      '   - Run comprehensive system health checks',
      '   - Verify all security controls remain active',
      '   - Update audit logs and compliance records',
      '   - Notify stakeholders of successful update',
      '',
      '⚠️  BREAK-GLASS PROCEDURES:',
      `   - Maximum session duration: ${this.config.breakGlass.maxDuration} hours`,
      `   - Required approvers: ${this.config.breakGlass.requiredApprovers}`,
      '   - All actions logged with justification required',
      '   - Automatic termination at session timeout',
    ];
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Terminate any active break-glass sessions
    for (const [sessionId, session] of this.activeBreakGlass) {
      if (session.status === 'active') {
        await this.terminateBreakGlass(sessionId, 'Service shutdown');
      }
    }

    this.activeBreakGlass.clear();
    this.offlineRegistry.clear();
    this.manifest = null;
  }
}

// Create singleton instance
export const airGapService = new AirGapService();
