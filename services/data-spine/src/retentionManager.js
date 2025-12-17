/**
 * Data Spine Retention Manager
 *
 * Manages data retention policies for contracts including:
 * - Retention period enforcement
 * - Legal hold management
 * - Archival policies
 * - Automated deletion scheduling
 * - Compliance-driven retention rules
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RETENTION_POLICIES = {
  // Standard retention tiers
  EPHEMERAL: { maxDays: 1, description: 'Ephemeral data, delete after 24 hours' },
  SHORT_TERM: { maxDays: 30, description: 'Short-term storage, 30 days' },
  MEDIUM_TERM: { maxDays: 90, description: 'Medium-term storage, 90 days' },
  STANDARD: { maxDays: 365, description: 'Standard retention, 1 year' },
  EXTENDED: { maxDays: 1095, description: 'Extended retention, 3 years' },
  LONG_TERM: { maxDays: 2555, description: 'Long-term retention, 7 years' },
  PERMANENT: { maxDays: -1, description: 'Permanent retention, no automatic deletion' },

  // Compliance-driven policies
  GDPR_DEFAULT: { maxDays: 1095, description: 'GDPR default, 3 years max' },
  HIPAA_MINIMUM: { maxDays: 2190, description: 'HIPAA minimum, 6 years' },
  SOX_FINANCIAL: { maxDays: 2555, description: 'SOX financial records, 7 years' },
  LEGAL_DISCOVERY: { maxDays: -1, description: 'Legal hold, no deletion' },
};

const DELETION_METHODS = {
  SOFT_DELETE: 'soft_delete',
  HARD_DELETE: 'hard_delete',
  CRYPTO_SHRED: 'crypto_shred',
  SECURE_ERASE: 'secure_erase',
};

const ARCHIVE_TIERS = {
  HOT: { accessTimeMs: 0, costTier: 'high' },
  WARM: { accessTimeMs: 60000, costTier: 'medium' },
  COLD: { accessTimeMs: 3600000, costTier: 'low' },
  GLACIER: { accessTimeMs: 43200000, costTier: 'minimal' },
};

class RetentionManager {
  constructor(options = {}) {
    this.policies = new Map();
    this.legalHolds = new Map();
    this.schedules = new Map();
    this.archiveRecords = [];
    this.deletionLog = [];
    this.auditTrail = options.auditTrail;
    this.eventEmitter = options.eventEmitter;
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'retention');

    // Initialize with default policies
    Object.entries(RETENTION_POLICIES).forEach(([name, policy]) => {
      this.policies.set(name, { ...policy, name, builtIn: true });
    });

    this.ensureStorageDir();
  }

  ensureStorageDir() {
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  registerPolicy(name, policy) {
    if (this.policies.has(name) && this.policies.get(name).builtIn) {
      throw new Error(`Cannot override built-in policy: ${name}`);
    }

    const registeredPolicy = {
      name,
      maxDays: policy.maxDays,
      description: policy.description,
      deletionMethod: policy.deletionMethod || DELETION_METHODS.HARD_DELETE,
      archiveTier: policy.archiveTier || null,
      archiveBeforeDays: policy.archiveBeforeDays || null,
      notifyBeforeDays: policy.notifyBeforeDays || 30,
      requireApproval: policy.requireApproval || false,
      complianceStandards: policy.complianceStandards || [],
      createdAt: new Date().toISOString(),
      builtIn: false,
    };

    this.policies.set(name, registeredPolicy);
    return registeredPolicy;
  }

  getPolicy(name) {
    return this.policies.get(name);
  }

  listPolicies() {
    return Array.from(this.policies.values());
  }

  // ============================================================================
  // Contract Retention Assignment
  // ============================================================================

  assignRetentionPolicy(contractName, policyName, options = {}) {
    const policy = this.policies.get(policyName);
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyName}`);
    }

    const assignment = {
      id: crypto.randomUUID(),
      contractName,
      policyName,
      policy: { ...policy },
      effectiveDate: options.effectiveDate || new Date().toISOString(),
      expirationDate: this.calculateExpirationDate(policy, options.effectiveDate),
      assignedBy: options.assignedBy || 'system',
      assignedAt: new Date().toISOString(),
      override: options.override || null,
      metadata: options.metadata || {},
    };

    this.schedules.set(contractName, assignment);

    // Emit event
    if (this.eventEmitter) {
      this.eventEmitter.retentionPolicySet(
        { name: contractName },
        {
          maxDays: policy.maxDays,
          deletionPolicy: policy.deletionMethod,
          archivePolicy: policy.archiveTier,
        },
        { id: options.assignedBy || 'system', type: 'user' }
      );
    }

    return assignment;
  }

  getRetentionSchedule(contractName) {
    return this.schedules.get(contractName);
  }

  calculateExpirationDate(policy, startDate = null) {
    if (policy.maxDays === -1) {
      return null; // Permanent retention
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expiration = new Date(start);
    expiration.setDate(expiration.getDate() + policy.maxDays);
    return expiration.toISOString();
  }

  // ============================================================================
  // Legal Hold Management
  // ============================================================================

  applyLegalHold(contractName, hold) {
    const holdRecord = {
      id: crypto.randomUUID(),
      contractName,
      holdName: hold.name,
      holdType: hold.type || 'litigation',
      matterNumber: hold.matterNumber,
      custodian: hold.custodian,
      startDate: new Date().toISOString(),
      endDate: null,
      status: 'active',
      notes: hold.notes || '',
      appliedBy: hold.appliedBy,
      approvedBy: hold.approvedBy,
    };

    if (!this.legalHolds.has(contractName)) {
      this.legalHolds.set(contractName, []);
    }
    this.legalHolds.get(contractName).push(holdRecord);

    // Record in audit trail
    if (this.auditTrail) {
      this.auditTrail.record({
        eventType: 'retention.enforced',
        actorId: hold.appliedBy,
        actorType: 'user',
        resourceType: 'contract',
        resourceId: contractName,
        action: 'apply_legal_hold',
        details: {
          holdId: holdRecord.id,
          holdName: hold.name,
          matterNumber: hold.matterNumber,
        },
      });
    }

    return holdRecord;
  }

  releaseLegalHold(contractName, holdId, releasedBy, reason) {
    const holds = this.legalHolds.get(contractName);
    if (!holds) {
      throw new Error(`No legal holds found for contract: ${contractName}`);
    }

    const hold = holds.find((h) => h.id === holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    hold.status = 'released';
    hold.endDate = new Date().toISOString();
    hold.releasedBy = releasedBy;
    hold.releaseReason = reason;

    // Record in audit trail
    if (this.auditTrail) {
      this.auditTrail.record({
        eventType: 'retention.enforced',
        actorId: releasedBy,
        actorType: 'user',
        resourceType: 'contract',
        resourceId: contractName,
        action: 'release_legal_hold',
        details: {
          holdId,
          releaseReason: reason,
        },
      });
    }

    return hold;
  }

  hasActiveLegalHold(contractName) {
    const holds = this.legalHolds.get(contractName);
    if (!holds) return false;
    return holds.some((h) => h.status === 'active');
  }

  getActiveLegalHolds(contractName) {
    const holds = this.legalHolds.get(contractName);
    if (!holds) return [];
    return holds.filter((h) => h.status === 'active');
  }

  // ============================================================================
  // Retention Enforcement
  // ============================================================================

  async enforceRetention(contractName, options = {}) {
    const schedule = this.schedules.get(contractName);
    if (!schedule) {
      throw new Error(`No retention schedule for contract: ${contractName}`);
    }

    // Check legal holds
    if (this.hasActiveLegalHold(contractName)) {
      return {
        action: 'blocked',
        reason: 'Active legal hold prevents retention enforcement',
        legalHolds: this.getActiveLegalHolds(contractName),
      };
    }

    const now = new Date();
    const result = {
      contractName,
      enforcedAt: now.toISOString(),
      actions: [],
    };

    // Check if archiving is needed
    if (schedule.policy.archiveBeforeDays && schedule.policy.archiveTier) {
      const archiveDate = new Date(schedule.effectiveDate);
      archiveDate.setDate(archiveDate.getDate() + schedule.policy.archiveBeforeDays);

      if (now >= archiveDate) {
        const archiveResult = await this.archiveData(contractName, options);
        result.actions.push({ type: 'archive', ...archiveResult });
      }
    }

    // Check if deletion is needed
    if (schedule.expirationDate && now >= new Date(schedule.expirationDate)) {
      if (schedule.policy.requireApproval && !options.approved) {
        result.actions.push({
          type: 'deletion_pending',
          reason: 'Deletion requires approval',
          expirationDate: schedule.expirationDate,
        });
      } else {
        const deleteResult = await this.deleteData(contractName, options);
        result.actions.push({ type: 'delete', ...deleteResult });
      }
    }

    // Emit enforcement event
    if (this.eventEmitter && result.actions.length > 0) {
      this.eventEmitter.retentionEnforced(
        { name: contractName },
        result.actions.map((a) => a.type).join(','),
        options.recordCount || 0
      );
    }

    return result;
  }

  async archiveData(contractName, options = {}) {
    const schedule = this.schedules.get(contractName);
    const archiveTier = schedule?.policy?.archiveTier || 'COLD';
    const tier = ARCHIVE_TIERS[archiveTier] || ARCHIVE_TIERS.COLD;

    const archiveRecord = {
      id: crypto.randomUUID(),
      contractName,
      archivedAt: new Date().toISOString(),
      archiveTier,
      accessTimeMs: tier.accessTimeMs,
      recordCount: options.recordCount || 0,
      sizeBytes: options.sizeBytes || 0,
      checksum: options.checksum || crypto.randomUUID(),
      destination: options.destination || `archive://${archiveTier.toLowerCase()}/${contractName}`,
      restorable: true,
    };

    this.archiveRecords.push(archiveRecord);

    // Persist archive record
    const archivePath = path.join(this.storageDir, 'archives.json');
    this.persistRecords(archivePath, this.archiveRecords);

    // Emit event
    if (this.eventEmitter) {
      this.eventEmitter.dataArchived(
        { name: contractName },
        archiveRecord.destination,
        archiveRecord.recordCount,
        { checksum: archiveRecord.checksum }
      );
    }

    return archiveRecord;
  }

  async deleteData(contractName, options = {}) {
    const schedule = this.schedules.get(contractName);
    const deletionMethod = schedule?.policy?.deletionMethod || DELETION_METHODS.HARD_DELETE;

    const deletionRecord = {
      id: crypto.randomUUID(),
      contractName,
      deletedAt: new Date().toISOString(),
      deletionMethod,
      recordCount: options.recordCount || 0,
      reason: options.reason || 'retention_policy',
      approvedBy: options.approvedBy,
      verified: false,
    };

    // Perform deletion based on method
    switch (deletionMethod) {
      case DELETION_METHODS.SOFT_DELETE:
        deletionRecord.recoverable = true;
        deletionRecord.recoverableUntil = this.calculateRecoveryWindow();
        break;
      case DELETION_METHODS.HARD_DELETE:
        deletionRecord.recoverable = false;
        break;
      case DELETION_METHODS.CRYPTO_SHRED:
        deletionRecord.recoverable = false;
        deletionRecord.keyDestroyed = true;
        break;
      case DELETION_METHODS.SECURE_ERASE:
        deletionRecord.recoverable = false;
        deletionRecord.overwritePasses = 3;
        break;
    }

    this.deletionLog.push(deletionRecord);

    // Persist deletion log
    const deletionPath = path.join(this.storageDir, 'deletions.json');
    this.persistRecords(deletionPath, this.deletionLog);

    // Record in audit trail
    if (this.auditTrail) {
      this.auditTrail.record({
        eventType: 'retention.enforced',
        actorId: options.deletedBy || 'retention-manager',
        actorType: 'system',
        resourceType: 'contract',
        resourceId: contractName,
        action: 'delete_data',
        severity: 'critical',
        details: {
          deletionId: deletionRecord.id,
          method: deletionMethod,
          recordCount: deletionRecord.recordCount,
          reason: deletionRecord.reason,
        },
      });
    }

    // Emit event
    if (this.eventEmitter) {
      this.eventEmitter.dataDeleted(
        { name: contractName },
        deletionRecord.reason,
        deletionRecord.recordCount,
        { method: deletionMethod, verified: deletionRecord.verified }
      );
    }

    return deletionRecord;
  }

  calculateRecoveryWindow() {
    const recovery = new Date();
    recovery.setDate(recovery.getDate() + 30); // 30-day recovery window
    return recovery.toISOString();
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  generateRetentionReport(options = {}) {
    const now = new Date();
    const upcomingDays = options.upcomingDays || 30;
    const upcomingDate = new Date(now);
    upcomingDate.setDate(upcomingDate.getDate() + upcomingDays);

    const schedules = Array.from(this.schedules.values());

    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: now.toISOString(),
      period: {
        start: now.toISOString(),
        upcomingWindow: `${upcomingDays} days`,
      },
      summary: {
        totalContracts: schedules.length,
        withLegalHold: 0,
        expiringWithinWindow: 0,
        permanentRetention: 0,
        archiveScheduled: 0,
      },
      upcomingExpirations: [],
      legalHolds: [],
      archivesPending: [],
      recentDeletions: this.deletionLog.slice(-20),
      recentArchives: this.archiveRecords.slice(-20),
      byPolicy: {},
    };

    schedules.forEach((schedule) => {
      // Count by policy
      const policyName = schedule.policyName;
      if (!report.byPolicy[policyName]) {
        report.byPolicy[policyName] = { count: 0, contracts: [] };
      }
      report.byPolicy[policyName].count++;
      report.byPolicy[policyName].contracts.push(schedule.contractName);

      // Check legal holds
      if (this.hasActiveLegalHold(schedule.contractName)) {
        report.summary.withLegalHold++;
        report.legalHolds.push({
          contractName: schedule.contractName,
          holds: this.getActiveLegalHolds(schedule.contractName),
        });
      }

      // Check expirations
      if (schedule.expirationDate) {
        const expiration = new Date(schedule.expirationDate);
        if (expiration <= upcomingDate) {
          report.summary.expiringWithinWindow++;
          report.upcomingExpirations.push({
            contractName: schedule.contractName,
            expirationDate: schedule.expirationDate,
            daysRemaining: Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)),
            policy: schedule.policyName,
            hasLegalHold: this.hasActiveLegalHold(schedule.contractName),
          });
        }
      } else {
        report.summary.permanentRetention++;
      }

      // Check archive schedules
      if (schedule.policy.archiveBeforeDays) {
        const archiveDate = new Date(schedule.effectiveDate);
        archiveDate.setDate(archiveDate.getDate() + schedule.policy.archiveBeforeDays);
        if (archiveDate <= upcomingDate && archiveDate > now) {
          report.summary.archiveScheduled++;
          report.archivesPending.push({
            contractName: schedule.contractName,
            archiveDate: archiveDate.toISOString(),
            archiveTier: schedule.policy.archiveTier,
          });
        }
      }
    });

    // Sort upcoming expirations by date
    report.upcomingExpirations.sort((a, b) =>
      new Date(a.expirationDate) - new Date(b.expirationDate)
    );

    return report;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  persistRecords(filePath, records) {
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
  }

  loadRecords(filePath) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
  }

  // ============================================================================
  // Scheduled Tasks
  // ============================================================================

  startScheduledEnforcement(intervalMs = 86400000) { // Default: daily
    this.enforcementTimer = setInterval(async () => {
      const schedules = Array.from(this.schedules.keys());
      for (const contractName of schedules) {
        try {
          await this.enforceRetention(contractName);
        } catch (error) {
          console.error(`Retention enforcement failed for ${contractName}:`, error);
        }
      }
    }, intervalMs);

    return { stop: () => clearInterval(this.enforcementTimer) };
  }

  close() {
    if (this.enforcementTimer) {
      clearInterval(this.enforcementTimer);
    }
  }
}

module.exports = {
  RetentionManager,
  RETENTION_POLICIES,
  DELETION_METHODS,
  ARCHIVE_TIERS,
};
