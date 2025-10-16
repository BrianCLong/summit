#!/usr/bin/env node

/**
 * Safety Circuit Breaker for Release Captain
 *
 * Implements circuit breaker patterns to prevent cascade failures
 * and enforce deployment safety windows.
 */

const fs = require('fs');
const { execSync } = require('child_process');

class SafetyCircuit {
  constructor() {
    this.stateFile = '/tmp/safety-circuit-state.json';
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } else {
        this.state = this.getDefaultState();
      }
    } catch (error) {
      console.warn(
        'Failed to load circuit state, using defaults:',
        error.message,
      );
      this.state = this.getDefaultState();
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save circuit state:', error.message);
    }
  }

  getDefaultState() {
    return {
      circuit: 'CLOSED', // CLOSED = normal, OPEN = blocked, HALF_OPEN = testing
      failureCount: 0,
      lastFailure: null,
      lastSuccess: null,
      blockedUntil: null,
      deploymentWindow: {
        start: '09:00', // 9 AM UTC - Conservative business hours
        end: '17:00', // 5 PM UTC - Conservative business hours
        timezone: 'UTC',
        allowedDays: [1, 2, 3, 4, 5], // Monday-Friday only
      },
      rateLimit: {
        maxDeploymentsPerHour: 3, // Conservative: max 3 deployments per hour
        maxDeploymentsPerDay: 10, // Conservative: max 10 deployments per day
        recentDeployments: [],
      },
      circuitBreaker: {
        failureThreshold: 3, // Open circuit after 3 failures
        recoveryCooldown: 30, // 30 minutes cooldown before HALF_OPEN
        testRequestLimit: 1, // Only 1 test request in HALF_OPEN
      },
      emergencyMode: false,
      auditLog: [], // Track all emergency overrides
      lastCheck: new Date().toISOString(),
    };
  }

  isDeploymentAllowed(options = {}) {
    console.log('🔍 Checking deployment safety circuit...');

    const checks = [
      this.checkCircuitState(),
      this.checkDeploymentWindow(),
      this.checkRateLimit(),
      this.checkSystemHealth(),
      this.checkChangeFreeze(),
    ];

    const results = checks.map((check) => check.call(this, options));
    const blocked = results.some((result) => !result.allowed);

    if (blocked) {
      const reasons = results
        .filter((result) => !result.allowed)
        .map((result) => result.reason);

      console.log('🚫 Deployment blocked:', reasons.join(', '));
      return {
        allowed: false,
        reasons: reasons,
        circuit: this.state.circuit,
      };
    }

    console.log('✅ Deployment allowed');
    return {
      allowed: true,
      circuit: this.state.circuit,
    };
  }

  checkCircuitState() {
    const now = new Date();

    switch (this.state.circuit) {
      case 'OPEN':
        // Check if circuit should move to HALF_OPEN
        if (
          this.state.blockedUntil &&
          now > new Date(this.state.blockedUntil)
        ) {
          this.state.circuit = 'HALF_OPEN';
          this.saveState();
          console.log('🟡 Circuit moved to HALF_OPEN - testing mode');
          return { allowed: true, reason: 'Circuit testing' };
        }
        return {
          allowed: false,
          reason: `Circuit OPEN until ${this.state.blockedUntil}`,
        };

      case 'HALF_OPEN':
        // Allow one deployment to test the circuit
        return { allowed: true, reason: 'Circuit testing deployment' };

      case 'CLOSED':
      default:
        return { allowed: true, reason: 'Circuit healthy' };
    }
  }

  checkDeploymentWindow() {
    if (this.state.emergencyMode) {
      return { allowed: true, reason: 'Emergency mode active' };
    }

    const now = new Date();
    const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Check if current day is allowed
    if (!this.state.deploymentWindow.allowedDays.includes(currentDay)) {
      return {
        allowed: false,
        reason: 'Deployment not allowed on weekends',
      };
    }

    // Check if current time is within deployment window
    const { start, end } = this.state.deploymentWindow;
    if (currentTime < start || currentTime > end) {
      return {
        allowed: false,
        reason: `Deployment outside window (${start}-${end} UTC)`,
      };
    }

    return { allowed: true, reason: 'Within deployment window' };
  }

  checkRateLimit() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Clean old deployments
    this.state.rateLimit.recentDeployments =
      this.state.rateLimit.recentDeployments.filter(
        (deployment) => new Date(deployment.timestamp) > oneDayAgo,
      );

    const recentDeployments = this.state.rateLimit.recentDeployments;
    const deploymentsLastHour = recentDeployments.filter(
      (deployment) => new Date(deployment.timestamp) > oneHourAgo,
    ).length;
    const deploymentsLastDay = recentDeployments.length;

    // Check hourly limit
    if (deploymentsLastHour >= this.state.rateLimit.maxDeploymentsPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${deploymentsLastHour}/${this.state.rateLimit.maxDeploymentsPerHour} per hour`,
      };
    }

    // Check daily limit
    if (deploymentsLastDay >= this.state.rateLimit.maxDeploymentsPerDay) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${deploymentsLastDay}/${this.state.rateLimit.maxDeploymentsPerDay} per day`,
      };
    }

    return { allowed: true, reason: 'Rate limit OK' };
  }

  checkSystemHealth() {
    try {
      // Quick health check of critical services
      const healthEndpoints = [
        'https://api.summit.dev/health',
        'https://graph.summit.dev/health',
      ];

      let healthyCount = 0;
      for (const endpoint of healthEndpoints) {
        try {
          execSync(`curl -f -s --max-time 10 "${endpoint}"`, { stdio: 'pipe' });
          healthyCount++;
        } catch (error) {
          console.warn(`Health check failed for ${endpoint}`);
        }
      }

      const healthPercentage = (healthyCount / healthEndpoints.length) * 100;
      if (healthPercentage < 50) {
        return {
          allowed: false,
          reason: `System health poor: ${healthPercentage.toFixed(0)}%`,
        };
      }

      return {
        allowed: true,
        reason: `System health good: ${healthPercentage.toFixed(0)}%`,
      };
    } catch (error) {
      console.warn('Health check failed:', error.message);
      return { allowed: true, reason: 'Health check inconclusive' };
    }
  }

  checkChangeFreeze() {
    try {
      // Check if there's an active change freeze
      if (fs.existsSync('ops/freeze-windows.yaml')) {
        const freezeConfig = fs.readFileSync('ops/freeze-windows.yaml', 'utf8');

        // Simple check for active freeze (would be more sophisticated in practice)
        if (freezeConfig.includes('active: true')) {
          return {
            allowed: false,
            reason: 'Change freeze active',
          };
        }
      }

      return { allowed: true, reason: 'No change freeze' };
    } catch (error) {
      return { allowed: true, reason: 'Change freeze check failed' };
    }
  }

  recordDeployment(success = true, metadata = {}) {
    const now = new Date();

    // Record deployment in rate limit tracking
    this.state.rateLimit.recentDeployments.push({
      timestamp: now.toISOString(),
      success: success,
      metadata: metadata,
    });

    if (success) {
      this.recordSuccess();
    } else {
      this.recordFailure();
    }

    this.saveState();
  }

  recordSuccess() {
    this.state.lastSuccess = new Date().toISOString();
    this.state.failureCount = 0;

    // If circuit was HALF_OPEN and deployment succeeded, close it
    if (this.state.circuit === 'HALF_OPEN') {
      this.state.circuit = 'CLOSED';
      console.log('✅ Circuit CLOSED - system recovered');
    }
  }

  recordFailure() {
    this.state.lastFailure = new Date().toISOString();
    this.state.failureCount++;

    const maxFailures = 3;
    const blockDurationMinutes = 30;

    if (this.state.failureCount >= maxFailures) {
      this.state.circuit = 'OPEN';
      this.state.blockedUntil = new Date(
        Date.now() + blockDurationMinutes * 60 * 1000,
      ).toISOString();

      console.log(
        `🚨 Circuit OPEN - too many failures (${this.state.failureCount})`,
      );
      console.log(`⏰ Blocked until: ${this.state.blockedUntil}`);
    }
  }

  enableEmergencyMode(reason = 'Manual override', user = 'unknown') {
    const timestamp = new Date().toISOString();
    console.log('🚨 Emergency mode ENABLED:', reason);

    this.state.emergencyMode = true;
    this.state.emergencyReason = reason;
    this.state.emergencyActivated = timestamp;

    // Audit log entry
    const auditEntry = {
      timestamp,
      action: 'EMERGENCY_ENABLED',
      user: user || process.env.GITHUB_ACTOR || 'unknown',
      reason,
      sessionId: `emergency-${Date.now()}`,
      ipAddress: process.env.GITHUB_SERVER_URL || 'github-actions',
    };

    this.state.auditLog = this.state.auditLog || [];
    this.state.auditLog.push(auditEntry);

    // Keep only last 100 audit entries
    if (this.state.auditLog.length > 100) {
      this.state.auditLog = this.state.auditLog.slice(-100);
    }

    this.saveState();

    // Create immutable audit record (GitHub issue)
    this.createEmergencyAuditIssue(auditEntry);
  }

  disableEmergencyMode(user = 'unknown') {
    const timestamp = new Date().toISOString();
    console.log('✅ Emergency mode DISABLED');

    // Audit log entry for disabling
    const auditEntry = {
      timestamp,
      action: 'EMERGENCY_DISABLED',
      user: user || process.env.GITHUB_ACTOR || 'unknown',
      reason: 'Emergency mode deactivated',
      sessionId: `emergency-${Date.now()}`,
      duration: this.state.emergencyActivated
        ? (
            (new Date() - new Date(this.state.emergencyActivated)) /
            1000 /
            60
          ).toFixed(2) + ' minutes'
        : 'unknown',
    };

    this.state.auditLog = this.state.auditLog || [];
    this.state.auditLog.push(auditEntry);

    this.state.emergencyMode = false;
    this.state.emergencyReason = null;
    this.state.emergencyActivated = null;
    this.saveState();
  }

  createEmergencyAuditIssue(auditEntry) {
    try {
      const issueBody = `## 🚨 Emergency Mode Activation Audit

**Timestamp**: ${auditEntry.timestamp}
**Action**: ${auditEntry.action}
**User**: @${auditEntry.user}
**Reason**: ${auditEntry.reason}
**Session ID**: ${auditEntry.sessionId}

### Context
This emergency override was triggered to bypass Release Captain safety controls.

### Security Information
- **IP Address**: ${auditEntry.ipAddress}
- **GitHub Actor**: ${process.env.GITHUB_ACTOR || 'unknown'}
- **Workflow**: ${process.env.GITHUB_WORKFLOW || 'unknown'}
- **Repository**: ${process.env.GITHUB_REPOSITORY || 'unknown'}

### Required Actions
- [ ] Review the emergency reason and validate it was appropriate
- [ ] Ensure the issue that triggered the emergency has been resolved
- [ ] Update runbooks if this revealed a gap in procedures
- [ ] Disable emergency mode when no longer needed

---
*This audit record is immutable and maintained for compliance purposes.*
*Emergency mode session: ${auditEntry.sessionId}*`;

      // Create issue using GitHub CLI (if available)
      if (process.env.GITHUB_TOKEN) {
        const { execSync } = require('child_process');
        const fs = require('fs');

        fs.writeFileSync('/tmp/emergency-audit.md', issueBody);

        execSync(
          `gh issue create \
          --title "🚨 Emergency Mode Audit: ${auditEntry.sessionId}" \
          --body-file /tmp/emergency-audit.md \
          --label "emergency-audit,security,compliance" \
          --assignee "${auditEntry.user}"`,
          {
            env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN },
          },
        );

        console.log(
          `📝 Emergency audit issue created for session ${auditEntry.sessionId}`,
        );
      }
    } catch (error) {
      console.warn('Failed to create emergency audit issue:', error.message);
    }
  }

  getStatus() {
    return {
      circuit: this.state.circuit,
      failureCount: this.state.failureCount,
      lastFailure: this.state.lastFailure,
      lastSuccess: this.state.lastSuccess,
      blockedUntil: this.state.blockedUntil,
      emergencyMode: this.state.emergencyMode,
      recentDeployments: this.state.rateLimit.recentDeployments.length,
      deploymentWindow: this.state.deploymentWindow,
    };
  }

  reset() {
    console.log('🔄 Resetting safety circuit');
    this.state = this.getDefaultState();
    this.saveState();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const circuit = new SafetyCircuit();

  switch (command) {
    case 'check':
      const result = circuit.isDeploymentAllowed();
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.allowed ? 0 : 1);
      break;

    case 'record-success':
      circuit.recordDeployment(true, { source: 'cli' });
      console.log('✅ Success recorded');
      break;

    case 'record-failure':
      circuit.recordDeployment(false, { source: 'cli' });
      console.log('❌ Failure recorded');
      break;

    case 'emergency-on':
      const reason = process.argv[3] || 'CLI activation';
      circuit.enableEmergencyMode(reason);
      break;

    case 'emergency-off':
      circuit.disableEmergencyMode();
      break;

    case 'status':
      console.log(JSON.stringify(circuit.getStatus(), null, 2));
      break;

    case 'reset':
      circuit.reset();
      break;

    default:
      console.log('Usage: safety-circuit.js <command>');
      console.log('Commands:');
      console.log('  check            - Check if deployment is allowed');
      console.log('  record-success   - Record successful deployment');
      console.log('  record-failure   - Record failed deployment');
      console.log('  emergency-on     - Enable emergency mode');
      console.log('  emergency-off    - Disable emergency mode');
      console.log('  status           - Show circuit status');
      console.log('  reset            - Reset circuit to default state');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Safety circuit error:', error.message);
    process.exit(1);
  });
}

module.exports = { SafetyCircuit };
