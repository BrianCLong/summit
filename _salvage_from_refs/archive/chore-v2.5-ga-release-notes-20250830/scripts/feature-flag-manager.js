#!/usr/bin/env node
/* eslint-disable */

/**
 * Feature Flag Management CLI
 * 
 * Manage feature flags across environments with rollout control
 */

import fs from 'fs';
import path from 'path';

const FLAG_DEFINITIONS = {
  'realtime-presence': {
    description: 'Platform-wide presence indicators with avatar groups',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 100
  },
  'graph-streaming': {
    description: 'Neighborhood streaming with progress indicators',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 80,
    performanceThreshold: {
      p95MaxMs: 900,
      errorRateMaxPercent: 1.0
    }
  },
  'k-shortest-paths': {
    description: 'K-shortest paths UI (k≤5, depth≤6)',
    defaultEnabled: true,
    environments: ['development', 'staging'],
    tenantOverrides: {
      'enterprise': false // Disable for enterprise initially
    },
    rolloutPercentage: 100
  },
  'advanced-search': {
    description: 'Query chips and keyboard DSL search',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 100
  },
  'bulk-actions': {
    description: 'Bulk operations on search results',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 90
  },
  'report-templates': {
    description: 'Executive and Forensics report templates',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 100,
    roleRestrictions: ['analyst', 'admin', 'investigator']
  },
  'forensics-reports': {
    description: 'Advanced forensics reporting with chain of custody',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 100,
    roleRestrictions: ['forensics', 'admin', 'legal']
  },
  'fps-monitor': {
    description: 'Development FPS monitoring',
    defaultEnabled: process.env.NODE_ENV === 'development',
    environments: ['development'],
    tenantOverrides: {},
    rolloutPercentage: 100
  },
  'event-inspector': {
    description: 'Development event inspector for GraphQL subscriptions',
    defaultEnabled: process.env.NODE_ENV === 'development',
    environments: ['development'],
    tenantOverrides: {},
    rolloutPercentage: 100
  },
  'optimistic-updates': {
    description: 'Optimistic mutations with conflict rollback',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 75
  },
  'multi-language': {
    description: 'NATO locale support (29 countries)',
    defaultEnabled: true,
    environments: ['staging', 'production'],
    tenantOverrides: {},
    rolloutPercentage: 50
  }
};

class FeatureFlagManager {
  constructor() {
    this.flagsPath = 'client/src/hooks/useFlag.ts';
  }

  listFlags() {
    console.log('🏁 Feature Flags Configuration');
    console.log('============================\n');

    Object.entries(FLAG_DEFINITIONS).forEach(([flagKey, config]) => {
      const status = config.defaultEnabled ? '✅ ENABLED' : '❌ DISABLED';
      const rollout = config.rolloutPercentage < 100 ? ` (${config.rolloutPercentage}%)` : '';
      
      console.log(`${status} ${flagKey}${rollout}`);
      console.log(`   ${config.description}`);
      console.log(`   Environments: ${config.environments.join(', ')}`);
      
      if (config.roleRestrictions) {
        console.log(`   Roles: ${config.roleRestrictions.join(', ')}`);
      }
      
      if (Object.keys(config.tenantOverrides).length > 0) {
        console.log(`   Tenant overrides: ${JSON.stringify(config.tenantOverrides)}`);
      }
      
      if (config.performanceThreshold) {
        console.log(`   Performance gates: p95<${config.performanceThreshold.p95MaxMs}ms, errors<${config.performanceThreshold.errorRateMaxPercent}%`);
      }
      
      console.log('');
    });
  }

  enableFlag(flagKey, options = {}) {
    if (!FLAG_DEFINITIONS[flagKey]) {
      throw new Error(`Unknown flag: ${flagKey}`);
    }

    console.log(`🟢 Enabling flag: ${flagKey}`);
    
    const updates = {
      defaultEnabled: true,
      rolloutPercentage: options.rollout || FLAG_DEFINITIONS[flagKey].rolloutPercentage,
      ...options
    };

    this.updateFlagDefinition(flagKey, updates);
    console.log(`✅ Flag ${flagKey} enabled`);
  }

  disableFlag(flagKey, options = {}) {
    if (!FLAG_DEFINITIONS[flagKey]) {
      throw new Error(`Unknown flag: ${flagKey}`);
    }

    console.log(`🔴 Disabling flag: ${flagKey}`);
    
    const updates = {
      defaultEnabled: false,
      rolloutPercentage: 0,
      ...options
    };

    this.updateFlagDefinition(flagKey, updates);
    console.log(`✅ Flag ${flagKey} disabled`);
  }

  setRollout(flagKey, percentage) {
    if (!FLAG_DEFINITIONS[flagKey]) {
      throw new Error(`Unknown flag: ${flagKey}`);
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    console.log(`📊 Setting rollout for ${flagKey}: ${percentage}%`);
    
    this.updateFlagDefinition(flagKey, {
      rolloutPercentage: percentage,
      defaultEnabled: percentage > 0
    });

    console.log(`✅ Rollout updated for ${flagKey}`);
  }

  setTenantOverride(flagKey, tenant, enabled) {
    if (!FLAG_DEFINITIONS[flagKey]) {
      throw new Error(`Unknown flag: ${flagKey}`);
    }

    console.log(`🏢 Setting tenant override for ${flagKey}: ${tenant} = ${enabled}`);
    
    const currentOverrides = FLAG_DEFINITIONS[flagKey].tenantOverrides || {};
    currentOverrides[tenant] = enabled;

    this.updateFlagDefinition(flagKey, {
      tenantOverrides: currentOverrides
    });

    console.log(`✅ Tenant override set for ${flagKey}`);
  }

  exportForEnvironment(environment) {
    console.log(`📤 Exporting flags for environment: ${environment}`);
    
    const envFlags = {};
    
    Object.entries(FLAG_DEFINITIONS).forEach(([flagKey, config]) => {
      if (config.environments.includes(environment)) {
        envFlags[flagKey] = {
          enabled: config.defaultEnabled,
          rollout: config.rolloutPercentage,
          conditions: {
            env: [environment],
            ...(config.roleRestrictions && { role: config.roleRestrictions })
          }
        };

        if (config.tenantOverrides && Object.keys(config.tenantOverrides).length > 0) {
          envFlags[flagKey].tenantOverrides = config.tenantOverrides;
        }
      }
    });

    const exportFile = `feature-flags-${environment}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(envFlags, null, 2));
    
    console.log(`✅ Exported to ${exportFile}`);
    return envFlags;
  }

  validatePerformance(flagKey, metrics) {
    const flag = FLAG_DEFINITIONS[flagKey];
    if (!flag.performanceThreshold) {
      console.log(`⚠️  No performance thresholds defined for ${flagKey}`);
      return true;
    }

    const { p95MaxMs, errorRateMaxPercent } = flag.performanceThreshold;
    
    console.log(`🔍 Validating performance for ${flagKey}:`);
    console.log(`   p95: ${metrics.p95}ms (limit: ${p95MaxMs}ms)`);
    console.log(`   Error rate: ${metrics.errorRate}% (limit: ${errorRateMaxPercent}%)`);

    const p95Valid = metrics.p95 <= p95MaxMs;
    const errorRateValid = metrics.errorRate <= errorRateMaxPercent;

    if (!p95Valid || !errorRateValid) {
      console.log(`❌ Performance validation failed for ${flagKey}`);
      console.log(`   Consider disabling or reducing rollout percentage`);
      return false;
    }

    console.log(`✅ Performance validation passed for ${flagKey}`);
    return true;
  }

  emergencyDisableAll(reason = 'Emergency disable') {
    console.log(`🚨 EMERGENCY: Disabling all non-essential flags`);
    console.log(`   Reason: ${reason}`);

    const essentialFlags = ['advanced-search']; // Keep essential features
    const emergencyCommands = [];

    Object.keys(FLAG_DEFINITIONS).forEach(flagKey => {
      if (!essentialFlags.includes(flagKey)) {
        emergencyCommands.push(`kubectl set env deployment/ui-prod FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}_ENABLED=false`);
      }
    });

    console.log('\n🔧 Execute these commands:');
    emergencyCommands.forEach(cmd => console.log(`   ${cmd}`));
    
    console.log('\n📝 Rollback plan:');
    console.log('   1. Identify root cause');
    console.log('   2. Apply targeted fix');
    console.log('   3. Re-enable flags one by one');
    console.log('   4. Monitor metrics after each re-enable');

    return emergencyCommands;
  }

  updateFlagDefinition(flagKey, updates) {
    // Update in-memory definition
    FLAG_DEFINITIONS[flagKey] = { ...FLAG_DEFINITIONS[flagKey], ...updates };
    
    // Update the actual source file
    this.updateSourceFile();
  }

  updateSourceFile() {
    const sourceFile = fs.readFileSync(this.flagsPath, 'utf8');
    
    // Generate new DEFAULT_FLAGS object
    const defaultFlagsObj = {};
    Object.entries(FLAG_DEFINITIONS).forEach(([flagKey, config]) => {
      const flagConfig = {
        enabled: config.defaultEnabled,
        rollout: config.rolloutPercentage
      };
      
      // Only add conditions if they exist
      const conditions = {};
      if (config.environments && config.environments.length > 0) {
        conditions.env = config.environments;
      }
      if (config.roleRestrictions && config.roleRestrictions.length > 0) {
        conditions.role = config.roleRestrictions;
      }
      
      if (Object.keys(conditions).length > 0) {
        flagConfig.conditions = conditions;
      }
      
      defaultFlagsObj[flagKey] = flagConfig;
    });

    // Replace DEFAULT_FLAGS in source with properly formatted TypeScript
    const flagsString = JSON.stringify(defaultFlagsObj, null, 2)
      .replace(/"([^\"]+)":/g, "'$1':") // Convert double quotes to single quotes for keys
      .replace(/"/g, "'"); // Convert remaining double quotes to single quotes
      
    const newDefaultFlags = `const DEFAULT_FLAGS: FlagConfig = ${flagsString};`;
    
    const updatedSource = sourceFile.replace(
      /const DEFAULT_FLAGS: FlagConfig = \{[\s\S]*?\};/,
      newDefaultFlags
    );

    fs.writeFileSync(this.flagsPath, updatedSource);
    console.log(`📝 Updated ${this.flagsPath}`);
  }

  generateKubernetesManifest(environment) {
    const envVars = [];
    
    Object.entries(FLAG_DEFINITIONS).forEach(([flagKey, config]) => {
      if (config.environments.includes(environment)) {
        const envName = `FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}_ENABLED`;
        envVars.push({
          name: envName,
          value: config.defaultEnabled.toString()
        });
      }
    });

    const manifest = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `feature-flags-${environment}`,
        namespace: 'default'
      },
      data: Object.fromEntries(
        envVars.map(env => [env.name, env.value])
      )
    };

    const manifestFile = `k8s-feature-flags-${environment}.yaml`;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    
    console.log(`📦 Generated Kubernetes manifest: ${manifestFile}`);
    return manifest;
  }
}

// CLI Interface
function main() {
  const manager = new FeatureFlagManager();
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'list':
        manager.listFlags();
        break;

      case 'enable':
        if (!args[0]) throw new Error('Flag name required');
        const enableOptions = {};
        if (args[1]) enableOptions.rollout = parseInt(args[1]);
        manager.enableFlag(args[0], enableOptions);
        break;

      case 'disable':
        if (!args[0]) throw new Error('Flag name required');
        manager.disableFlag(args[0]);
        break;

      case 'rollout':
        if (!args[0] || !args[1]) throw new Error('Flag name and percentage required');
        manager.setRollout(args[0], parseInt(args[1]));
        break;

      case 'tenant':
        if (!args[0] || !args[1] || !args[2]) throw new Error('Flag name, tenant, and enabled (true/false) required');
        manager.setTenantOverride(args[0], args[1], args[2] === 'true');
        break;

      case 'export':
        if (!args[0]) throw new Error('Environment required');
        manager.exportForEnvironment(args[0]);
        break;

      case 'validate':
        if (!args[0]) throw new Error('Flag name required');
        const metrics = {
          p95: parseFloat(args[1]) || 300,
          errorRate: parseFloat(args[2]) || 0.1
        };
        manager.validatePerformance(args[0], metrics);
        break;

      case 'emergency-disable':
        manager.emergencyDisableAll(args[0]);
        break;

      case 'k8s-manifest':
        if (!args[0]) throw new Error('Environment required');
        manager.generateKubernetesManifest(args[0]);
        break;

      default:
        console.log(`
🏁 Feature Flag Manager

Usage:
  node feature-flag-manager.js <command> [args]

Commands:
  list                           List all flags and their status
  enable <flag> [rollout%]       Enable a flag with optional rollout percentage
  disable <flag>                 Disable a flag
  rollout <flag> <percentage>    Set rollout percentage (0-100)
  tenant <flag> <tenant> <bool>  Set tenant override (true/false)
  export <env>                   Export flags for environment
  validate <flag> <p95> <error%> Validate flag against performance thresholds
  emergency-disable [reason]     Disable all non-essential flags
  k8s-manifest <env>             Generate Kubernetes ConfigMap

Examples:
  node feature-flag-manager.js list
  node feature-flag-manager.js enable realtime-presence 75
  node feature-flag-manager.js rollout graph-streaming 50
  node feature-flag-manager.js tenant k-shortest-paths enterprise false
  node feature-flag-manager.js export production
  node feature-flag-manager.js validate graph-streaming 450 0.5
  node feature-flag-manager.js emergency-disable "High error rate"
        `);
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FeatureFlagManager, FLAG_DEFINITIONS };