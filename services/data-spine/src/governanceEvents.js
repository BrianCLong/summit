/**
 * Data Spine Governance Events
 *
 * Emits governance events to the data spine itself, creating a self-documenting
 * governance record. Events follow the base-envelope schema defined in
 * schemas/data-spine/events/.
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

const EVENT_TYPES = {
  // Contract lifecycle
  CONTRACT_CREATED: 'governance.contract_created.v1',
  CONTRACT_UPDATED: 'governance.contract_updated.v1',
  CONTRACT_VALIDATED: 'governance.contract_validated.v1',
  CONTRACT_BUMPED: 'governance.contract_bumped.v1',
  CONTRACT_DEPRECATED: 'governance.contract_deprecated.v1',

  // Policy events
  POLICY_APPLIED: 'governance.policy_applied.v1',
  POLICY_VIOLATED: 'governance.policy_violated.v1',
  POLICY_OVERRIDE: 'governance.policy_override.v1',

  // Access events
  ACCESS_GRANTED: 'governance.access_granted.v1',
  ACCESS_DENIED: 'governance.access_denied.v1',
  ACCESS_REVOKED: 'governance.access_revoked.v1',

  // Compliance events
  COMPLIANCE_ASSESSED: 'governance.compliance_assessed.v1',
  COMPLIANCE_VIOLATION: 'governance.compliance_violation.v1',
  COMPLIANCE_REMEDIATED: 'governance.compliance_remediated.v1',

  // Data operations
  DATA_TOKENIZED: 'governance.data_tokenized.v1',
  DATA_DETOKENIZED: 'governance.data_detokenized.v1',
  DATA_REDACTED: 'governance.data_redacted.v1',
  DATA_EXPORTED: 'governance.data_exported.v1',

  // Residency events
  RESIDENCY_CHECKED: 'governance.residency_checked.v1',
  RESIDENCY_VIOLATED: 'governance.residency_violated.v1',

  // Retention events
  RETENTION_POLICY_SET: 'governance.retention_policy_set.v1',
  RETENTION_ENFORCED: 'governance.retention_enforced.v1',
  DATA_ARCHIVED: 'governance.data_archived.v1',
  DATA_DELETED: 'governance.data_deleted.v1',

  // Lineage events
  LINEAGE_RECORDED: 'governance.lineage_recorded.v1',
  LINEAGE_CHAIN_BROKEN: 'governance.lineage_chain_broken.v1',

  // Classification events
  CLASSIFICATION_CHANGED: 'governance.classification_changed.v1',
  CLASSIFICATION_UPGRADED: 'governance.classification_upgraded.v1',
  CLASSIFICATION_DOWNGRADED: 'governance.classification_downgraded.v1',
};

function createEnvelope(eventType, data, context = {}) {
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    event_version: 'v1',
    occurred_at: new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    tenant_id: context.tenantId || 'default',
    subject_id: context.subjectId || null,
    source_service: 'data-spine',
    trace_id: context.traceId || null,
    correlation_id: context.correlationId || null,
    region: context.region || null,
    data,
  };
}

class GovernanceEventEmitter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sinks = [];
    this.buffer = [];
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000;
    this.defaultContext = options.defaultContext || {};

    if (options.autoFlush !== false) {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }

    // Register default console sink for development
    if (options.consoleLogging !== false && process.env.NODE_ENV !== 'production') {
      this.registerSink({
        name: 'console',
        emit: (event) => {
          console.log(`[GOVERNANCE EVENT] ${event.event_type}`, JSON.stringify(event.data, null, 2));
        },
      });
    }
  }

  // ============================================================================
  // Sink Management
  // ============================================================================

  registerSink(sink) {
    if (!sink.name || typeof sink.emit !== 'function') {
      throw new Error('Sink must have name and emit function');
    }
    this.sinks.push(sink);
  }

  removeSink(sinkName) {
    this.sinks = this.sinks.filter((s) => s.name !== sinkName);
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  emitEvent(eventType, data, context = {}) {
    const envelope = createEnvelope(
      eventType,
      data,
      { ...this.defaultContext, ...context }
    );

    // Buffer event
    this.buffer.push(envelope);

    // Emit locally for real-time subscribers
    this.emit('governance-event', envelope);
    this.emit(eventType, envelope);

    // Flush if buffer full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    return envelope;
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    for (const sink of this.sinks) {
      try {
        await Promise.all(events.map((event) => sink.emit(event)));
      } catch (error) {
        console.error(`Failed to emit to sink ${sink.name}:`, error);
        // Re-buffer failed events for retry
        this.buffer.push(...events);
      }
    }
  }

  // ============================================================================
  // Contract Events
  // ============================================================================

  contractCreated(contract, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.CONTRACT_CREATED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        classification: contract.classification,
        residency: contract.residency,
        actor_id: actor.id,
        actor_type: actor.type,
        schema_checksum: contract.checksum,
      },
      context
    );
  }

  contractUpdated(contract, changes, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.CONTRACT_UPDATED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        changes,
        actor_id: actor.id,
        actor_type: actor.type,
        previous_checksum: changes.previousChecksum,
        new_checksum: changes.newChecksum,
      },
      context
    );
  }

  contractValidated(contract, result, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.CONTRACT_VALIDATED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        valid: result.valid,
        errors: result.errors || [],
        warnings: result.warnings || [],
        validated_by: result.validatedBy || 'system',
      },
      context
    );
  }

  contractBumped(contract, fromVersion, toVersion, level, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.CONTRACT_BUMPED,
      {
        contract_name: contract.name,
        from_version: fromVersion,
        to_version: toVersion,
        bump_level: level,
        actor_id: actor.id,
        actor_type: actor.type,
      },
      context
    );
  }

  contractDeprecated(contract, reason, successor, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.CONTRACT_DEPRECATED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        deprecation_reason: reason,
        successor_contract: successor,
        actor_id: actor.id,
        actor_type: actor.type,
        deprecated_at: new Date().toISOString(),
      },
      context
    );
  }

  // ============================================================================
  // Policy Events
  // ============================================================================

  policyApplied(contract, policy, record, result, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.POLICY_APPLIED,
      {
        contract_name: contract.name,
        policy_type: policy.type,
        policy_version: policy.version,
        fields_affected: result.fieldsAffected || [],
        environment: result.environment,
        record_id: record.id,
        transformation_type: result.transformationType,
      },
      context
    );
  }

  policyViolated(contract, policy, violation, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.POLICY_VIOLATED,
      {
        contract_name: contract.name,
        policy_type: policy.type,
        policy_id: policy.id,
        violation_type: violation.type,
        violation_severity: violation.severity,
        violation_message: violation.message,
        remediation: violation.remediation,
        detected_at: new Date().toISOString(),
      },
      context
    );
  }

  policyOverride(contract, policy, override, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.POLICY_OVERRIDE,
      {
        contract_name: contract.name,
        policy_type: policy.type,
        policy_id: policy.id,
        override_reason: override.reason,
        override_duration: override.duration,
        override_expires_at: override.expiresAt,
        actor_id: actor.id,
        actor_type: actor.type,
        approved_by: override.approvedBy,
      },
      context
    );
  }

  // ============================================================================
  // Access Events
  // ============================================================================

  accessGranted(resource, actor, permissions, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.ACCESS_GRANTED,
      {
        resource_type: resource.type,
        resource_id: resource.id,
        actor_id: actor.id,
        actor_type: actor.type,
        permissions_granted: permissions,
        granted_by: context.grantedBy || 'system',
      },
      context
    );
  }

  accessDenied(resource, actor, reason, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.ACCESS_DENIED,
      {
        resource_type: resource.type,
        resource_id: resource.id,
        resource_action: resource.action,
        actor_id: actor.id,
        actor_type: actor.type,
        actor_roles: actor.roles,
        denial_reason: reason,
        policy_id: context.policyId,
      },
      context
    );
  }

  accessRevoked(resource, actor, revokedBy, reason, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.ACCESS_REVOKED,
      {
        resource_type: resource.type,
        resource_id: resource.id,
        actor_id: actor.id,
        actor_type: actor.type,
        revoked_by: revokedBy,
        revocation_reason: reason,
      },
      context
    );
  }

  // ============================================================================
  // Compliance Events
  // ============================================================================

  complianceAssessed(contract, assessment, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.COMPLIANCE_ASSESSED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        assessment_id: assessment.assessmentId,
        standards_checked: assessment.standards.map((s) => s.standardId),
        overall_score: assessment.overallScore,
        overall_compliant: assessment.overallCompliant,
        violation_count: assessment.violations.length,
        assessed_at: assessment.assessedAt,
      },
      context
    );
  }

  complianceViolation(contract, standard, violation, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.COMPLIANCE_VIOLATION,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        standard_id: standard.id,
        standard_version: standard.version,
        violation_id: violation.id,
        requirement_id: violation.requirementId,
        severity: violation.severity,
        category: violation.category,
        description: violation.description,
      },
      context
    );
  }

  complianceRemediated(contract, violation, remediation, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.COMPLIANCE_REMEDIATED,
      {
        contract_name: contract.name,
        violation_id: violation.id,
        standard_id: violation.standardId,
        remediation_action: remediation.action,
        remediated_by: remediation.resolvedBy,
        remediated_at: remediation.resolvedAt,
        verification_status: remediation.verified ? 'verified' : 'pending',
      },
      context
    );
  }

  // ============================================================================
  // Data Operation Events
  // ============================================================================

  dataTokenized(contract, fields, recordCount, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_TOKENIZED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        fields_tokenized: fields,
        record_count: recordCount,
        environment: context.environment,
        tokenization_method: 'aes-256-ctr',
        deterministic: true,
        reversible: true,
      },
      context
    );
  }

  dataDetokenized(contract, fields, recordCount, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_DETOKENIZED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        fields_detokenized: fields,
        record_count: recordCount,
        actor_id: actor.id,
        actor_type: actor.type,
        environment: context.environment,
        justification: context.justification,
      },
      context
    );
  }

  dataRedacted(contract, fields, recordCount, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_REDACTED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        fields_redacted: fields,
        record_count: recordCount,
        redaction_method: 'replacement',
        irreversible: true,
        environment: context.environment,
      },
      context
    );
  }

  dataExported(contract, destination, format, recordCount, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_EXPORTED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        destination_type: destination.type,
        destination_id: destination.id,
        export_format: format,
        record_count: recordCount,
        actor_id: actor.id,
        actor_type: actor.type,
        export_checksum: context.checksum,
      },
      context
    );
  }

  // ============================================================================
  // Residency Events
  // ============================================================================

  residencyChecked(contract, region, result, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.RESIDENCY_CHECKED,
      {
        contract_name: contract.name,
        requested_region: region,
        allowed_regions: contract.residency?.allowedRegions,
        default_region: contract.residency?.defaultRegion,
        check_result: result.allowed ? 'allowed' : 'denied',
        effective_region: result.effectiveRegion,
      },
      context
    );
  }

  residencyViolated(contract, requestedRegion, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.RESIDENCY_VIOLATED,
      {
        contract_name: contract.name,
        requested_region: requestedRegion,
        allowed_regions: contract.residency?.allowedRegions,
        violation_type: 'region_not_allowed',
        severity: 'critical',
      },
      context
    );
  }

  // ============================================================================
  // Retention Events
  // ============================================================================

  retentionPolicySet(contract, policy, actor, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.RETENTION_POLICY_SET,
      {
        contract_name: contract.name,
        retention_days: policy.maxDays,
        deletion_policy: policy.deletionPolicy,
        archive_policy: policy.archivePolicy,
        legal_hold: policy.legalHold || false,
        actor_id: actor.id,
        actor_type: actor.type,
      },
      context
    );
  }

  retentionEnforced(contract, action, recordCount, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.RETENTION_ENFORCED,
      {
        contract_name: contract.name,
        enforcement_action: action,
        records_affected: recordCount,
        retention_policy_version: context.policyVersion,
        enforced_by: 'retention-manager',
      },
      context
    );
  }

  dataArchived(contract, destination, recordCount, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_ARCHIVED,
      {
        contract_name: contract.name,
        archive_destination: destination,
        records_archived: recordCount,
        archive_checksum: context.checksum,
        retention_expires_at: context.expiresAt,
      },
      context
    );
  }

  dataDeleted(contract, reason, recordCount, context = {}) {
    return this.emitEvent(
      EVENT_TYPES.DATA_DELETED,
      {
        contract_name: contract.name,
        deletion_reason: reason,
        records_deleted: recordCount,
        deletion_method: context.method || 'hard_delete',
        deletion_verified: context.verified || false,
      },
      context
    );
  }

  // ============================================================================
  // Classification Events
  // ============================================================================

  classificationChanged(contract, previousClassification, newClassification, actor, context = {}) {
    const direction = this.getClassificationDirection(previousClassification, newClassification);

    return this.emitEvent(
      direction === 'upgrade'
        ? EVENT_TYPES.CLASSIFICATION_UPGRADED
        : direction === 'downgrade'
          ? EVENT_TYPES.CLASSIFICATION_DOWNGRADED
          : EVENT_TYPES.CLASSIFICATION_CHANGED,
      {
        contract_name: contract.name,
        contract_version: contract.version,
        previous_classification: previousClassification,
        new_classification: newClassification,
        classification_direction: direction,
        actor_id: actor.id,
        actor_type: actor.type,
        change_reason: context.reason,
        approval_id: context.approvalId,
      },
      context
    );
  }

  getClassificationDirection(previous, next) {
    const levels = { Public: 0, Internal: 1, Confidential: 2, Secret: 3, PII: 2 };
    const prevMax = Math.max(...(previous || []).map((c) => levels[c] || 0));
    const nextMax = Math.max(...(next || []).map((c) => levels[c] || 0));

    if (nextMax > prevMax) return 'upgrade';
    if (nextMax < prevMax) return 'downgrade';
    return 'lateral';
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    return this.flush();
  }
}

module.exports = {
  GovernanceEventEmitter,
  EVENT_TYPES,
  createEnvelope,
};
