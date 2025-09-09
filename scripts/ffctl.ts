#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface FeatureFlag {
  default: boolean;
  description?: string;
  owners?: string[];
  rollout?: {
    dev?: number;
    staging?: number;
    prod?: number;
  };
  guardrails?: {
    requires?: string[];
    metrics?: string[];
    max_concurrent_jobs?: number;
    max_concurrent_users?: number;
    performance_budget?: string;
  };
  immutable?: boolean;
  created_at?: string;
}

interface FeatureFlags {
  features: Record<string, FeatureFlag>;
}

class FeatureFlagController {
  private flagsPath: string;
  private flags: FeatureFlags;

  constructor() {
    this.flagsPath = path.join(process.cwd(), 'feature-flags', 'flags.yaml');
    this.loadFlags();
  }

  private loadFlags(): void {
    try {
      const fileContent = fs.readFileSync(this.flagsPath, 'utf8');
      this.flags = yaml.load(fileContent) as FeatureFlags;
    } catch (error) {
      console.error(`❌ Failed to load feature flags from ${this.flagsPath}`);
      console.error(error);
      process.exit(1);
    }
  }

  private saveFlags(): void {
    try {
      const yamlContent = yaml.dump(this.flags, { 
        indent: 2,
        lineWidth: 100,
        noRefs: true 
      });
      fs.writeFileSync(this.flagsPath, yamlContent);
    } catch (error) {
      console.error(`❌ Failed to save feature flags to ${this.flagsPath}`);
      console.error(error);
      process.exit(1);
    }
  }

  list(): void {
    console.log('🏁 Feature Flags Status:\n');
    
    Object.entries(this.flags.features).forEach(([name, flag]) => {
      const status = flag.default ? '🟢 ON' : '🔴 OFF';
      const owners = flag.owners ? `[${flag.owners.join(', ')}]` : '[no owner]';
      const immutable = flag.immutable ? '🔒' : '  ';
      
      console.log(`${immutable} ${status} ${name.padEnd(30)} ${owners}`);
      
      if (flag.description) {
        console.log(`     ${flag.description}`);
      }
      
      if (flag.rollout) {
        const rolloutStr = Object.entries(flag.rollout)
          .map(([env, percent]) => `${env}:${percent}%`)
          .join(', ');
        console.log(`     Rollout: ${rolloutStr}`);
      }
      
      console.log('');
    });
  }

  get(name: string): void {
    if (!this.flags.features[name]) {
      console.error(`❌ Feature flag '${name}' not found`);
      process.exit(1);
    }

    const flag = this.flags.features[name];
    console.log(`🏁 Feature Flag: ${name}\n`);
    console.log(`Status: ${flag.default ? '🟢 ENABLED' : '🔴 DISABLED'}`);
    console.log(`Description: ${flag.description || 'No description'}`);
    console.log(`Owners: ${flag.owners ? flag.owners.join(', ') : 'None'}`);
    console.log(`Immutable: ${flag.immutable ? 'Yes' : 'No'}`);
    console.log(`Created: ${flag.created_at || 'Unknown'}`);
    
    if (flag.rollout) {
      console.log('\n📊 Rollout Percentages:');
      Object.entries(flag.rollout).forEach(([env, percent]) => {
        console.log(`  ${env}: ${percent}%`);
      });
    }
    
    if (flag.guardrails) {
      console.log('\n🛡️ Guardrails:');
      if (flag.guardrails.requires) {
        console.log(`  Requires: ${flag.guardrails.requires.join(', ')}`);
      }
      if (flag.guardrails.metrics) {
        console.log(`  Metrics: ${flag.guardrails.metrics.join(', ')}`);
      }
      if (flag.guardrails.max_concurrent_jobs) {
        console.log(`  Max concurrent jobs: ${flag.guardrails.max_concurrent_jobs}`);
      }
      if (flag.guardrails.max_concurrent_users) {
        console.log(`  Max concurrent users: ${flag.guardrails.max_concurrent_users}`);
      }
      if (flag.guardrails.performance_budget) {
        console.log(`  Performance budget: ${flag.guardrails.performance_budget}`);
      }
    }
  }

  set(name: string, value: boolean): void {
    if (!this.flags.features[name]) {
      console.error(`❌ Feature flag '${name}' not found`);
      console.error('Available flags:', Object.keys(this.flags.features).join(', '));
      process.exit(1);
    }

    const flag = this.flags.features[name];
    
    if (flag.immutable) {
      console.error(`❌ Feature flag '${name}' is immutable and cannot be changed`);
      process.exit(1);
    }

    const oldValue = flag.default;
    flag.default = value;
    
    this.saveFlags();
    
    const action = value ? 'ENABLED' : 'DISABLED';
    const emoji = value ? '🟢' : '🔴';
    console.log(`${emoji} Successfully ${action} feature flag '${name}'`);
    console.log(`   Previous: ${oldValue ? 'enabled' : 'disabled'}`);
    console.log(`   Current:  ${value ? 'enabled' : 'disabled'}`);
    
    if (flag.guardrails?.requires) {
      console.log(`\n⚠️ Note: This flag requires: ${flag.guardrails.requires.join(', ')}`);
    }
  }

  rollout(name: string, environment: string, percentage: number): void {
    if (!this.flags.features[name]) {
      console.error(`❌ Feature flag '${name}' not found`);
      process.exit(1);
    }

    const flag = this.flags.features[name];
    
    if (flag.immutable) {
      console.error(`❌ Feature flag '${name}' is immutable and cannot be changed`);
      process.exit(1);
    }

    if (percentage < 0 || percentage > 100) {
      console.error(`❌ Percentage must be between 0 and 100, got ${percentage}`);
      process.exit(1);
    }

    if (!['dev', 'staging', 'prod'].includes(environment)) {
      console.error(`❌ Environment must be one of: dev, staging, prod`);
      process.exit(1);
    }

    if (!flag.rollout) {
      flag.rollout = {};
    }

    const oldValue = flag.rollout[environment as keyof typeof flag.rollout] || 0;
    (flag.rollout as any)[environment] = percentage;
    
    this.saveFlags();
    
    console.log(`🎯 Updated rollout for '${name}' in ${environment}`);
    console.log(`   Previous: ${oldValue}%`);
    console.log(`   Current:  ${percentage}%`);
  }

  killSwitch(name: string): void {
    console.log(`🚨 EMERGENCY KILL SWITCH for '${name}'`);
    
    if (!this.flags.features[name]) {
      console.error(`❌ Feature flag '${name}' not found`);
      process.exit(1);
    }

    const flag = this.flags.features[name];
    
    if (flag.immutable) {
      console.error(`❌ Cannot kill switch immutable flag '${name}'`);
      process.exit(1);
    }

    // Immediately disable globally
    flag.default = false;
    
    // Set all rollout percentages to 0
    if (flag.rollout) {
      Object.keys(flag.rollout).forEach(env => {
        (flag.rollout as any)[env] = 0;
      });
    }
    
    this.saveFlags();
    
    console.log(`🔴 KILLED: Feature flag '${name}' has been emergency disabled`);
    console.log(`   ✅ Global default set to false`);
    console.log(`   ✅ All environment rollouts set to 0%`);
    console.log(`\n⚠️ Please investigate the issue and re-enable carefully when safe`);
  }
}

function showUsage(): void {
  console.log(`
🏁 Feature Flag Controller (ffctl)

Usage:
  ffctl list                              # List all feature flags
  ffctl get <flag-name>                   # Show detailed info for a flag
  ffctl set <flag-name> <true|false>      # Enable/disable a flag globally
  ffctl rollout <flag-name> <env> <percent> # Set rollout percentage for environment
  ffctl kill <flag-name>                  # Emergency kill switch (disable everywhere)

Examples:
  ffctl list
  ffctl get graph_reranker_v2
  ffctl set experimental_batch_import true
  ffctl rollout ai_assisted_analysis prod 50
  ffctl kill real_time_collaboration

Environments: dev, staging, prod
`);
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const controller = new FeatureFlagController();
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        controller.list();
        break;
      
      case 'get':
        if (args.length !== 2) {
          console.error('❌ Usage: ffctl get <flag-name>');
          process.exit(1);
        }
        controller.get(args[1]);
        break;
      
      case 'set':
        if (args.length !== 3) {
          console.error('❌ Usage: ffctl set <flag-name> <true|false>');
          process.exit(1);
        }
        const value = args[2].toLowerCase();
        if (value !== 'true' && value !== 'false') {
          console.error('❌ Value must be true or false');
          process.exit(1);
        }
        controller.set(args[1], value === 'true');
        break;
      
      case 'rollout':
        if (args.length !== 4) {
          console.error('❌ Usage: ffctl rollout <flag-name> <environment> <percentage>');
          process.exit(1);
        }
        const percentage = parseInt(args[3]);
        if (isNaN(percentage)) {
          console.error('❌ Percentage must be a number');
          process.exit(1);
        }
        controller.rollout(args[1], args[2], percentage);
        break;
      
      case 'kill':
        if (args.length !== 2) {
          console.error('❌ Usage: ffctl kill <flag-name>');
          process.exit(1);
        }
        controller.killSwitch(args[1]);
        break;
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}