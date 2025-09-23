#!/usr/bin/env node

/**
 * CD Freeze Window Checker
 *
 * Enforces deployment freeze windows based on configuration.
 * Supports manual override via CD_OVERRIDE environment variable.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class FreezeChecker {
  constructor(freezeConfigPath) {
    this.freezeConfigPath = freezeConfigPath;
    this.config = this.loadFreezeConfig();
  }

  loadFreezeConfig() {
    try {
      const configContent = fs.readFileSync(this.freezeConfigPath, 'utf8');
      return yaml.parse(configContent);
    } catch (error) {
      console.error(`❌ Failed to load freeze config: ${error.message}`);
      process.exit(1);
    }
  }

  isInFreezeWindow(environment = 'production') {
    const now = new Date();
    const envConfig = this.config.environments[environment];

    if (!envConfig) {
      console.log(`⚠️  No freeze configuration for environment: ${environment}`);
      return false;
    }

    // Check permanent freeze
    if (envConfig.permanent_freeze) {
      return {
        frozen: true,
        reason: 'permanent_freeze',
        message: 'Environment is under permanent freeze',
        window: null
      };
    }

    // Check scheduled freeze windows
    for (const window of envConfig.freeze_windows || []) {
      if (this.isDateInWindow(now, window)) {
        return {
          frozen: true,
          reason: 'scheduled_freeze',
          message: `Deployment freeze: ${window.name}`,
          window: window
        };
      }
    }

    // Check emergency freeze
    if (envConfig.emergency_freeze?.active) {
      const emergencyEnd = new Date(envConfig.emergency_freeze.until);
      if (now <= emergencyEnd) {
        return {
          frozen: true,
          reason: 'emergency_freeze',
          message: `Emergency freeze until ${emergencyEnd.toISOString()}`,
          window: envConfig.emergency_freeze
        };
      }
    }

    return {
      frozen: false,
      reason: 'no_freeze',
      message: 'No active freeze window',
      window: null
    };
  }

  isDateInWindow(date, window) {
    const start = new Date(window.start);
    const end = new Date(window.end);

    // Handle recurring windows
    if (window.recurring) {
      return this.isDateInRecurringWindow(date, window);
    }

    return date >= start && date <= end;
  }

  isDateInRecurringWindow(date, window) {
    const { pattern } = window.recurring;

    switch (pattern) {
      case 'weekly':
        return this.isDateInWeeklyWindow(date, window);
      case 'monthly':
        return this.isDateInMonthlyWindow(date, window);
      case 'daily':
        return this.isDateInDailyWindow(date, window);
      default:
        console.warn(`Unknown recurring pattern: ${pattern}`);
        return false;
    }
  }

  isDateInWeeklyWindow(date, window) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startTime = this.parseTime(window.recurring.start_time);
    const endTime = this.parseTime(window.recurring.end_time);
    const currentTime = date.getHours() * 60 + date.getMinutes();

    if (window.recurring.days_of_week?.includes(dayOfWeek)) {
      return currentTime >= startTime && currentTime <= endTime;
    }

    return false;
  }

  isDateInMonthlyWindow(date, window) {
    const dayOfMonth = date.getDate();
    const startTime = this.parseTime(window.recurring.start_time);
    const endTime = this.parseTime(window.recurring.end_time);
    const currentTime = date.getHours() * 60 + date.getMinutes();

    if (window.recurring.days_of_month?.includes(dayOfMonth)) {
      return currentTime >= startTime && currentTime <= endTime;
    }

    return false;
  }

  isDateInDailyWindow(date, window) {
    const startTime = this.parseTime(window.recurring.start_time);
    const endTime = this.parseTime(window.recurring.end_time);
    const currentTime = date.getHours() * 60 + date.getMinutes();

    return currentTime >= startTime && currentTime <= endTime;
  }

  parseTime(timeStr) {
    // Parse "HH:MM" format to minutes since midnight
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  checkApprovalRequired(freezeStatus, environment) {
    if (!freezeStatus.frozen) {
      return { required: false };
    }

    const envConfig = this.config.environments[environment];
    const approvers = envConfig.approvers || this.config.global.approvers || [];

    return {
      required: true,
      approvers: approvers,
      override_process: envConfig.override_process || this.config.global.override_process
    };
  }

  async checkForApproval(environment) {
    // In a real implementation, this would check for:
    // 1. GitHub issue/PR approval from authorized approvers
    // 2. Slack approval workflow
    // 3. External approval system integration

    // For now, just check CD_OVERRIDE environment variable
    const override = process.env.CD_OVERRIDE;

    if (override === 'true' || override === '1') {
      console.log('🚨 CD_OVERRIDE detected - bypassing freeze window');
      return {
        approved: true,
        method: 'environment_override',
        approver: process.env.GITHUB_ACTOR || 'unknown'
      };
    }

    return {
      approved: false,
      method: 'none',
      approver: null
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const environment = args.find(arg => arg.startsWith('--environment='))?.split('=')[1] || 'production';
  const freezeConfigPath = args.find(arg => arg.startsWith('--freeze-config='))?.split('=')[1] || 'ops/freeze-windows.yaml';

  console.log(`🕐 Checking freeze windows for environment: ${environment}`);
  console.log(`📋 Using config: ${freezeConfigPath}`);

  const checker = new FreezeChecker(freezeConfigPath);
  const freezeStatus = checker.isInFreezeWindow(environment);

  console.log(`🎯 Freeze status: ${freezeStatus.frozen ? '🚫 FROZEN' : '✅ CLEAR'}`);
  console.log(`💬 Reason: ${freezeStatus.message}`);

  if (freezeStatus.frozen) {
    const approvalInfo = checker.checkApprovalRequired(freezeStatus, environment);
    const approval = await checker.checkForApproval(environment);

    if (approval.approved) {
      console.log(`✅ Deployment approved by: ${approval.approver} (${approval.method})`);

      // Set GitHub Actions output
      console.log(`::set-output name=status::approved`);
      console.log(`::set-output name=approver::${approval.approver}`);
      console.log(`::set-output name=method::${approval.method}`);

      process.exit(0);
    } else {
      console.log(`❌ Deployment blocked by freeze window`);
      console.log(`🔐 Required approvers: ${approvalInfo.approvers.join(', ')}`);
      console.log(`📝 Override process: ${approvalInfo.override_process}`);

      if (freezeStatus.window) {
        console.log(`⏰ Window: ${freezeStatus.window.name}`);
        if (freezeStatus.window.end) {
          console.log(`⏳ Ends: ${freezeStatus.window.end}`);
        }
      }

      // Set GitHub Actions output
      console.log(`::set-output name=status::blocked`);
      console.log(`::set-output name=reason::${freezeStatus.reason}`);

      process.exit(1);
    }
  } else {
    console.log(`✅ No freeze window active - deployment allowed`);

    // Set GitHub Actions output
    console.log(`::set-output name=status::allowed`);

    process.exit(0);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Check freeze failed:', error);
    process.exit(1);
  });
}

module.exports = { FreezeChecker };