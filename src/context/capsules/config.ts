// src/context/capsules/config.ts
// Configuration for the Invariant-Carrying Context Capsules (IC³) system

/**
 * Configuration for the Invariant-Carrying Context Capsules (IC³) system
 */
export interface IC3Config {
  // Security settings
  security: {
    enableCryptographicValidation: boolean;
    defaultTrustTier: 'high' | 'medium' | 'low' | 'untrusted';
    enableContentScanning: boolean;
    maxTokenCount: number;
    maxSizeInBytes: number;
  };
  
  // Performance settings
  performance: {
    maxValidationTimeMs: number;
    enableCaching: boolean;
    cacheTtlMs: number;
    maxConcurrentValidations: number;
  };
  
  // Enforcement settings
  enforcement: {
    violationSeverityThreshold: 'critical' | 'high' | 'medium' | 'low';
    defaultEnforcementAction: 'reject' | 'quarantine' | 'audit-only' | 'approve';
    enableTransitiveValidation: boolean;
    violationLogging: boolean;
  };
  
  // Invariant settings
  invariants: {
    defaultLanguage: string;
    supportedLanguages: string[];
    enableCustomInvariants: boolean;
    maxInvariantsPerCapsule: number;
  };
}

/**
 * Default configuration for the IC³ system
 */
export const defaultIC3Config: IC3Config = {
  security: {
    enableCryptographicValidation: true,
    defaultTrustTier: 'medium',
    enableContentScanning: true,
    maxTokenCount: 2048,
    maxSizeInBytes: 1024 * 1024  // 1MB
  },
  
  performance: {
    maxValidationTimeMs: 5000,  // 5 seconds
    enableCaching: true,
    cacheTtlMs: 300000,  // 5 minutes
    maxConcurrentValidations: 10
  },
  
  enforcement: {
    violationSeverityThreshold: 'high',
    defaultEnforcementAction: 'quarantine',
    enableTransitiveValidation: true,
    violationLogging: true
  },
  
  invariants: {
    defaultLanguage: 'ic3-dsl',
    supportedLanguages: [
      'ic3-text-filter',
      'ic3-data-type',
      'ic3-size-limit', 
      'ic3-token-limit',
      'ic3-content-pattern',
      'ic3-data-flow',
      'ic3-reasoning-step',
      'ic3-output-format'
    ],
    enableCustomInvariants: true,
    maxInvariantsPerCapsule: 10
  }
};

/**
 * Get the current configuration, potentially from environment
 */
export function getIC3Config(): IC3Config {
  // In a real implementation, this would merge environment variables
  // or configuration files with the default config
  return { ...defaultIC3Config };
}

/**
 * Validate the configuration structure
 */
export function validateConfig(config: IC3Config): boolean {
  // Basic validation to ensure config structure is sound
  if (config.security.maxTokenCount <= 0) {
    console.error('Invalid security configuration: maxTokenCount must be positive');
    return false;
  }
  
  if (config.security.maxSizeInBytes <= 0) {
    console.error('Invalid security configuration: maxSizeInBytes must be positive');
    return false;
  }
  
  if (config.performance.maxValidationTimeMs <= 0) {
    console.error('Invalid performance configuration: maxValidationTimeMs must be positive');
    return false;
  }
  
  if (config.performance.maxConcurrentValidations <= 0) {
    console.error('Invalid performance configuration: maxConcurrentValidations must be positive');
    return false;
  }
  
  if (config.invariants.maxInvariantsPerCapsule <= 0) {
    console.error('Invalid invariants configuration: maxInvariantsPerCapsule must be positive');
    return false;
  }
  
  return true;
}