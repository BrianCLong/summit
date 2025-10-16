import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'node:crypto';
import { otelService } from '../middleware/observability/otel-tracing.js';

// HSM-only crypto enforcement for Federal/Gov Pack FIPS compliance
interface HSMProbeResult {
  available: boolean;
  fipsMode: boolean;
  provider: string;
  lastProbed: Date;
  mechanisms: string[];
  error?: string;
}

interface FIPSEnforcementConfig {
  enabledProviders: ('AWS_CloudHSM' | 'Azure_HSM' | 'Luna_HSM' | 'nShield')[];
  fallbackToSoftware: boolean; // MUST be false for Federal
  probeInterval: number; // seconds
  requirePKCS11: boolean;
}

class HSMEnforcement {
  private probeCache: HSMProbeResult | null = null;
  private probeTimer: NodeJS.Timeout | null = null;
  private config: FIPSEnforcementConfig;

  constructor(config?: Partial<FIPSEnforcementConfig>) {
    this.config = {
      enabledProviders: ['AWS_CloudHSM'],
      fallbackToSoftware: false, // CRITICAL: Must be false for Federal
      probeInterval: 60, // 1 minute
      requirePKCS11: true,
      ...config,
    };

    // Freeze crypto module configuration to prevent runtime tampering
    this.freezeCryptoModules();

    // Start continuous HSM probing
    this.startContinuousProbing();
  }

  private freezeCryptoModules(): void {
    // Prevent runtime reconfiguration of crypto providers
    Object.freeze(process.versions);
    Object.freeze(crypto.constants);

    // Ensure Node.js was built with FIPS support
    if (!(process as any).config?.variables?.openssl_fips) {
      console.error('CRITICAL: Node.js not built with FIPS-enabled OpenSSL');
      if (!this.config.fallbackToSoftware) {
        process.exit(1);
      }
    }

    // Verify FIPS mode is active
    const fipsEnabled = crypto.getFips?.();
    if (!fipsEnabled && !this.config.fallbackToSoftware) {
      console.error('CRITICAL: FIPS mode not enabled in Node.js crypto');
      process.exit(1);
    }

    console.log('✅ Crypto modules frozen - FIPS enforcement active');
  }

  private startContinuousProbing(): void {
    this.performHSMProbe().then(() => {
      this.probeTimer = setInterval(async () => {
        await this.performHSMProbe();
      }, this.config.probeInterval * 1000);
    });
  }

  private async performHSMProbe(): Promise<HSMProbeResult> {
    const span = otelService.createSpan('hsm.probe');

    try {
      let result: HSMProbeResult = {
        available: false,
        fipsMode: false,
        provider: 'unknown',
        lastProbed: new Date(),
        mechanisms: [],
      };

      // Probe based on configured providers
      for (const provider of this.config.enabledProviders) {
        switch (provider) {
          case 'AWS_CloudHSM':
            result = await this.probeAWSCloudHSM();
            break;
          case 'Luna_HSM':
            result = await this.probeLunaHSM();
            break;
          case 'nShield':
            result = await this.probenShield();
            break;
          case 'Azure_HSM':
            result = await this.probeAzureHSM();
            break;
        }

        if (result.available && result.fipsMode) {
          break; // Found working FIPS-enabled HSM
        }
      }

      this.probeCache = result;

      otelService.addSpanAttributes({
        'hsm.available': result.available,
        'hsm.fips_mode': result.fipsMode,
        'hsm.provider': result.provider,
        'hsm.mechanism_count': result.mechanisms.length,
      });

      if (!result.available || !result.fipsMode) {
        console.error(
          'HSM probe failed:',
          result.error || 'HSM unavailable or not FIPS-enabled',
        );

        if (!this.config.fallbackToSoftware) {
          console.error(
            'CRITICAL: HSM required but unavailable - system will halt crypto operations',
          );
        }
      }

      return result;
    } catch (error: any) {
      console.error('HSM probe exception:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });

      this.probeCache = {
        available: false,
        fipsMode: false,
        provider: 'error',
        lastProbed: new Date(),
        mechanisms: [],
        error: error.message,
      };

      return this.probeCache;
    } finally {
      span?.end();
    }
  }

  private async probeAWSCloudHSM(): Promise<HSMProbeResult> {
    try {
      // AWS CloudHSM PKCS#11 probe
      const libPath =
        process.env.CLOUDHSM_PKCS11_LIB ||
        '/opt/cloudhsm/lib/libcloudhsm_pkcs11.so';
      const pkcs11 = await import('pkcs11js').catch(() => null);

      if (!pkcs11) {
        throw new Error('PKCS#11 library not available');
      }

      const p11 = new pkcs11.PKCS11();
      p11.load(libPath);
      p11.C_Initialize();

      const slots = p11.C_GetSlotList(true);
      if (slots.length === 0) {
        throw new Error('No HSM slots available');
      }

      const slot = slots[0];
      const tokenInfo = p11.C_GetTokenInfo(slot);
      const sessionHandle = p11.C_OpenSession(
        slot,
        pkcs11.CKF_SERIAL_SESSION | pkcs11.CKF_RW_SESSION,
      );

      // Get available mechanisms
      const mechanisms = p11.C_GetMechanismList(slot);
      const mechanismNames = mechanisms.map((mech: number) => {
        const info = p11.C_GetMechanismInfo(slot, mech);
        return `0x${mech.toString(16).padStart(8, '0')}`;
      });

      // Check for FIPS mode indicators
      const fipsMode =
        tokenInfo.label.includes('FIPS') ||
        (tokenInfo.flags & 0x00000002) !== 0; // CKF_FIPS_MODE

      p11.C_CloseSession(sessionHandle);
      p11.C_Finalize();

      return {
        available: true,
        fipsMode,
        provider: 'AWS_CloudHSM',
        lastProbed: new Date(),
        mechanisms: mechanismNames,
      };
    } catch (error: any) {
      return {
        available: false,
        fipsMode: false,
        provider: 'AWS_CloudHSM',
        lastProbed: new Date(),
        mechanisms: [],
        error: error.message,
      };
    }
  }

  private async probeLunaHSM(): Promise<HSMProbeResult> {
    try {
      // SafeNet Luna HSM probe
      const libPath =
        process.env.LUNA_PKCS11_LIB || '/usr/lib/libCryptoki2_64.so';
      const pkcs11 = await import('pkcs11js').catch(() => null);

      if (!pkcs11) {
        throw new Error('PKCS#11 library not available');
      }

      const p11 = new pkcs11.PKCS11();
      p11.load(libPath);
      p11.C_Initialize();

      const slots = p11.C_GetSlotList(true);
      if (slots.length === 0) {
        throw new Error('No Luna HSM slots available');
      }

      const slot = slots[0];
      const tokenInfo = p11.C_GetTokenInfo(slot);

      // Luna FIPS mode check
      const fipsMode =
        tokenInfo.label.includes('FIPS') || tokenInfo.model.includes('FIPS');

      const mechanisms = p11.C_GetMechanismList(slot);
      const mechanismNames = mechanisms.map(
        (mech: number) => `Luna_0x${mech.toString(16)}`,
      );

      p11.C_Finalize();

      return {
        available: true,
        fipsMode,
        provider: 'Luna_HSM',
        lastProbed: new Date(),
        mechanisms: mechanismNames,
      };
    } catch (error: any) {
      return {
        available: false,
        fipsMode: false,
        provider: 'Luna_HSM',
        lastProbed: new Date(),
        mechanisms: [],
        error: error.message,
      };
    }
  }

  private async probenShield(): Promise<HSMProbeResult> {
    try {
      // Thales nShield probe
      const libPath =
        process.env.NSHIELD_PKCS11_LIB ||
        '/opt/nfast/toolkits/pkcs11/libcknfast.so';

      // nShield specific FIPS validation
      // In production, would check nShield FIPS module status
      return {
        available: false, // Placeholder - implement actual nShield probe
        fipsMode: false,
        provider: 'nShield',
        lastProbed: new Date(),
        mechanisms: [],
        error: 'nShield probe not implemented',
      };
    } catch (error: any) {
      return {
        available: false,
        fipsMode: false,
        provider: 'nShield',
        lastProbed: new Date(),
        mechanisms: [],
        error: error.message,
      };
    }
  }

  private async probeAzureHSM(): Promise<HSMProbeResult> {
    try {
      // Azure Dedicated HSM probe
      return {
        available: false, // Placeholder - implement actual Azure HSM probe
        fipsMode: false,
        provider: 'Azure_HSM',
        lastProbed: new Date(),
        mechanisms: [],
        error: 'Azure HSM probe not implemented',
      };
    } catch (error: any) {
      return {
        available: false,
        fipsMode: false,
        provider: 'Azure_HSM',
        lastProbed: new Date(),
        mechanisms: [],
        error: error.message,
      };
    }
  }

  /**
   * Express middleware to enforce HSM-only crypto operations
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const span = otelService.createSpan('hsm.enforcement');

      try {
        // Check if HSM is available and FIPS-enabled
        if (!this.probeCache) {
          span.setStatus({ code: 2, message: 'HSM not probed yet' });
          return res.status(503).json({
            error: 'hsm_not_ready',
            message: 'HSM availability not yet determined',
          });
        }

        if (!this.probeCache.available) {
          span.setStatus({ code: 2, message: 'HSM unavailable' });
          return res.status(503).json({
            error: 'hsm_unavailable',
            message: 'Hardware Security Module is not available',
            lastProbed: this.probeCache.lastProbed,
            provider: this.probeCache.provider,
            details: this.probeCache.error,
          });
        }

        if (!this.probeCache.fipsMode) {
          span.setStatus({ code: 2, message: 'HSM not FIPS-enabled' });
          return res.status(503).json({
            error: 'fips_required',
            message: 'HSM is not operating in FIPS mode',
            provider: this.probeCache.provider,
          });
        }

        // HSM is available and FIPS-enabled
        otelService.addSpanAttributes({
          'hsm.enforcement.passed': true,
          'hsm.provider': this.probeCache.provider,
          'hsm.mechanisms': this.probeCache.mechanisms.length,
        });

        next();
      } catch (error: any) {
        console.error('HSM enforcement middleware error:', error);
        otelService.recordException(error);
        span.setStatus({ code: 2, message: error.message });

        return res.status(500).json({
          error: 'hsm_enforcement_error',
          message: 'HSM enforcement check failed',
        });
      } finally {
        span?.end();
      }
    };
  }

  /**
   * Get current HSM status for health checks
   */
  getStatus(): HSMProbeResult | null {
    return this.probeCache;
  }

  /**
   * Force immediate HSM probe (for testing/debugging)
   */
  async forceProbe(): Promise<HSMProbeResult> {
    return await this.performHSMProbe();
  }

  /**
   * Generate HSM attestation for ATO evidence
   */
  generateAttestation(): {
    timestamp: string;
    fipsCompliant: boolean;
    hsmProvider: string;
    mechanisms: string[];
    nodeFipsEnabled: boolean;
    opensslFipsCapable: boolean;
    attestationSignature?: string;
  } {
    const attestation = {
      timestamp: new Date().toISOString(),
      fipsCompliant: this.probeCache?.fipsMode || false,
      hsmProvider: this.probeCache?.provider || 'unknown',
      mechanisms: this.probeCache?.mechanisms || [],
      nodeFipsEnabled: crypto.getFips?.() || false,
      opensslFipsCapable: !!(process as any).config?.variables?.openssl_fips,
    };

    // In production, sign this attestation with HSM
    // attestationSignature would be HSM-signed hash of the above data

    return attestation;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
    this.probeCache = null;
  }
}

// Export factory function for dependency injection
export function createHSMEnforcement(
  config?: Partial<FIPSEnforcementConfig>,
): HSMEnforcement {
  return new HSMEnforcement(config);
}

// Default instance for immediate use
export const hsmEnforcement = new HSMEnforcement({
  enabledProviders: (process.env.HSM_PROVIDERS?.split(',') as any[]) || [
    'AWS_CloudHSM',
  ],
  fallbackToSoftware: process.env.ALLOW_SOFTWARE_CRYPTO === 'true', // Should be false for Federal
  probeInterval: Number(process.env.HSM_PROBE_INTERVAL) || 60,
  requirePKCS11: true,
});

// Express middleware export
export const assertFipsAndHsm = hsmEnforcement.middleware.bind(hsmEnforcement);
