import { randomUUID } from 'crypto';
import logger from '../../config/logger';
import { writeAudit } from '../../utils/audit';
import {
  AuditTrailEntry,
  ChainOfCustodyAdapter,
  ComplianceCheckpoint,
  CustodianStatus,
  EDiscoveryCollectionRequest,
  EDiscoveryCollectionResult,
  LegalHoldCustodian,
  LegalHoldInitiationInput,
  LegalHoldNotificationDispatcher,
  LegalHoldNotificationRecord,
  LegalHoldOrchestratorOptions,
  LegalHoldRecord,
  LegalHoldRepository,
  LegalHoldStatus,
  LifecyclePolicyLink,
  PreservationConnector,
  PreservationHoldInput,
  PreservationHoldResult,
  PreservationVerificationResult,
} from './types';

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function now(): Date {
  return new Date();
}

export class LegalHoldOrchestrator {
  private readonly repository: LegalHoldRepository;
  private readonly connectors: Map<string, PreservationConnector> = new Map();
  private readonly notificationDispatcher?: LegalHoldNotificationDispatcher;
  private readonly chainOfCustody?: ChainOfCustodyAdapter;
  private readonly lifecyclePolicies: LifecyclePolicyLink[];
  private readonly auditWriter: (entry: AuditTrailEntry) => Promise<void>;

  constructor(options: LegalHoldOrchestratorOptions) {
    if (!options.repository) {
      throw new Error('LegalHoldOrchestrator requires a repository');
    }
    if (!options.connectors?.length) {
      throw new Error(
        'LegalHoldOrchestrator requires at least one preservation connector',
      );
    }

    this.repository = options.repository;
    options.connectors.forEach((connector) => {
      this.connectors.set(connector.id, connector);
    });
    this.notificationDispatcher = options.notificationDispatcher;
    this.chainOfCustody = options.chainOfCustody;
    this.lifecyclePolicies = options.lifecyclePolicies ?? [];
    this.auditWriter =
      options.auditWriter ?? this.defaultAuditWriter.bind(this);
  }

  async initiateHold(
    input: LegalHoldInitiationInput,
  ): Promise<LegalHoldRecord> {
    const holdId = `hold_${randomUUID()}`;
    const createdAt = now();
    const normalizedCustodians = input.custodians.map((custodian) => ({
      ...custodian,
      status: custodian.status ?? 'pending_notification',
      notifiedAt: custodian.notifiedAt ?? null,
      acknowledgedAt: custodian.acknowledgedAt ?? null,
      releasedAt: custodian.releasedAt ?? null,
    }));

    const lifecyclePolicies = this.resolveLifecyclePolicies(
      input.scope,
      input.lifecyclePolicyOverrides,
    );

    const holdRecord: LegalHoldRecord = {
      holdId,
      caseId: input.caseId,
      holdName: input.holdName,
      status: 'DRAFT',
      reason: input.reason,
      issuedBy: input.issuedBy,
      scope: cloneDeep(input.scope),
      custodians: normalizedCustodians,
      connectors: [],
      lifecyclePolicies,
      compliance: [],
      notifications: [],
      createdAt,
      updatedAt: createdAt,
      eDiscovery: input.eDiscovery
        ? {
            enabled: input.eDiscovery.enabled,
            matterId: input.eDiscovery.matterId,
            exportFormats: input.eDiscovery.exportFormats,
            latestCollections: [],
          }
        : undefined,
      metadata: cloneDeep(input.additionalMetadata ?? {}),
    };

    await this.repository.create(holdRecord);

    await this.appendAudit({
      holdId,
      caseId: input.caseId,
      actorId: input.issuedBy.id,
      actorRole: input.issuedBy.role,
      action: 'LEGAL_HOLD_INITIATED',
      details: {
        holdName: input.holdName,
        connectors: input.scope.connectors,
        custodians: normalizedCustodians.map((c) => c.id),
        lifecyclePolicies: lifecyclePolicies.map((policy) => policy.policyId),
      },
      createdAt,
    });

    if (this.chainOfCustody) {
      try {
        await this.chainOfCustody.appendEvent({
          caseId: input.caseId,
          actorId: input.issuedBy.id,
          action: 'LEGAL_HOLD_INITIATED',
          payload: {
            holdId,
            holdName: input.holdName,
            custodians: normalizedCustodians.map((c) => c.id),
          },
        });
      } catch (error) {
        logger.error(
          { err: error },
          'Failed to append chain of custody event for legal hold',
        );
      }
    }

    await this.notifyCustodians(holdRecord, input.notificationTemplateId);

    const connectorResults: PreservationHoldResult[] = [];
    let holdStatus: LegalHoldStatus = 'ACTIVE';

    for (const connectorId of input.scope.connectors) {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        logger.warn(
          { connectorId },
          'Connector not registered for legal hold scope',
        );
        holdStatus = 'FAILED';
        continue;
      }

      const holdInput: PreservationHoldInput = {
        holdId,
        caseId: input.caseId,
        holdName: input.holdName,
        custodians: normalizedCustodians,
        scope: input.scope,
        issuedBy: input.issuedBy,
        metadata: input.additionalMetadata,
      };

      try {
        const result = await connector.applyHold(holdInput);
        connectorResults.push(result);
        await this.repository.recordConnectorAction(holdId, result);
        await this.recordComplianceCheckpoint(holdId, {
          checkId: `connector:${connectorId}:apply`,
          description: `Preservation hold applied via ${connector.displayName}`,
          status: result.status === 'applied' ? 'pass' : 'warning',
          details: result.error
            ? `Hold applied with warnings: ${result.error}`
            : `Reference ${result.referenceId}`,
          timestamp: now(),
        });

        if (connector.supportsVerification && result.status === 'applied') {
          const verification = await connector.verifyHold(
            holdId,
            input.caseId,
            input.scope,
          );
          await this.repository.recordVerification(holdId, verification);
          await this.recordComplianceCheckpoint(holdId, {
            checkId: `connector:${connectorId}:verify`,
            description: `Preservation verification for ${connector.displayName}`,
            status: verification.verified ? 'pass' : 'fail',
            details: verification.details,
            timestamp: verification.checkedAt,
          });
          if (!verification.verified) {
            holdStatus = 'FAILED';
          }
        }

        if (result.status === 'failed') {
          holdStatus = 'FAILED';
        }
      } catch (error) {
        logger.error(
          { err: error, connectorId, holdId },
          'Connector failed to apply legal hold',
        );
        connectorResults.push({
          connectorId,
          referenceId: 'n/a',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await this.repository.recordConnectorAction(holdId, {
          connectorId,
          referenceId: 'n/a',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await this.recordComplianceCheckpoint(holdId, {
          checkId: `connector:${connectorId}:apply`,
          description: `Preservation hold failed via ${connectorId}`,
          status: 'fail',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: now(),
        });
        holdStatus = 'FAILED';
      }
    }

    holdRecord.connectors = connectorResults;
    holdRecord.status = holdStatus;
    holdRecord.updatedAt = now();

    await this.repository.update(holdId, {
      connectors: connectorResults,
      custodians: normalizedCustodians,
      status: holdStatus,
      updatedAt: holdRecord.updatedAt,
    });

    await this.appendAudit({
      holdId,
      caseId: input.caseId,
      actorId: input.issuedBy.id,
      actorRole: input.issuedBy.role,
      action: 'LEGAL_HOLD_PRESERVATION_COMPLETE',
      details: {
        status: holdStatus,
        connectors: connectorResults,
      },
      createdAt: holdRecord.updatedAt,
    });

    return (await this.repository.getById(holdId)) ?? holdRecord;
  }

  async verifyPreservation(
    holdId: string,
  ): Promise<PreservationVerificationResult[]> {
    const hold = await this.ensureHold(holdId);
    const verifications: PreservationVerificationResult[] = [];

    for (const connectorResult of hold.connectors) {
      const connector = this.connectors.get(connectorResult.connectorId);
      if (!connector?.supportsVerification) {
        continue;
      }

      try {
        const verification = await connector.verifyHold(
          holdId,
          hold.caseId,
          hold.scope,
        );
        verifications.push(verification);
        await this.repository.recordVerification(holdId, verification);
        await this.recordComplianceCheckpoint(holdId, {
          checkId: `connector:${connector.id}:verify:manual`,
          description: `Manual preservation verification for ${connector.displayName}`,
          status: verification.verified ? 'pass' : 'fail',
          details: verification.details,
          timestamp: verification.checkedAt,
        });
      } catch (error) {
        logger.error(
          { err: error, connectorId: connectorResult.connectorId, holdId },
          'Failed to verify preservation hold',
        );
        verifications.push({
          connectorId: connectorResult.connectorId,
          referenceId: connectorResult.referenceId,
          verified: false,
          details: error instanceof Error ? error.message : 'Unknown error',
          checkedAt: now(),
        });
        await this.repository.recordVerification(holdId, verifications.at(-1)!);
        await this.recordComplianceCheckpoint(holdId, {
          checkId: `connector:${connectorResult.connectorId}:verify:error`,
          description: 'Preservation verification error',
          status: 'fail',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: now(),
        });
      }
    }

    await this.appendAudit({
      holdId,
      caseId: hold.caseId,
      actorId: 'system',
      actorRole: 'automation',
      action: 'LEGAL_HOLD_VERIFICATION_RUN',
      details: { verifications },
      createdAt: now(),
    });

    return verifications;
  }

  async recordCustodianAcknowledgement(
    holdId: string,
    custodianId: string,
    actor: { id: string; role?: string },
  ): Promise<void> {
    const hold = await this.ensureHold(holdId);
    const custodian = hold.custodians.find((c) => c.id === custodianId);
    if (!custodian) {
      throw new Error(`Custodian ${custodianId} not found for hold ${holdId}`);
    }

    const acknowledgementAt = now();
    await this.repository.recordCustodianStatus(
      holdId,
      custodianId,
      'acknowledged',
      {
        acknowledgedAt,
        status: 'acknowledged',
      },
    );

    await this.appendAudit({
      holdId,
      caseId: hold.caseId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'LEGAL_HOLD_CUSTODIAN_ACKNOWLEDGED',
      details: { custodianId },
      createdAt: acknowledgementAt,
    });
  }

  async prepareEDiscoveryExport(
    holdId: string,
    request: Omit<EDiscoveryCollectionRequest, 'holdId' | 'caseId'>,
  ): Promise<EDiscoveryCollectionResult[]> {
    const hold = await this.ensureHold(holdId);
    const exportRequests: EDiscoveryCollectionResult[] = [];

    for (const connectorResult of hold.connectors) {
      const connector = this.connectors.get(connectorResult.connectorId);
      if (!connector?.supportsExport || !connector.collectPreservedData) {
        continue;
      }

      try {
        const collection = await connector.collectPreservedData({
          ...request,
          holdId,
          caseId: hold.caseId,
          matterId: request.matterId ?? hold.eDiscovery?.matterId,
        });
        exportRequests.push(collection);
      } catch (error) {
        logger.error(
          { err: error, connectorId: connectorResult.connectorId, holdId },
          'Failed to collect e-discovery export',
        );
        exportRequests.push({
          connectorId: connectorResult.connectorId,
          exportPath: 'n/a',
          format:
            request.exportFormat ??
            hold.eDiscovery?.exportFormats?.[0] ??
            'zip',
          itemCount: 0,
          generatedAt: now(),
        });
      }
    }

    await this.appendAudit({
      holdId,
      caseId: hold.caseId,
      actorId: 'system',
      actorRole: 'automation',
      action: 'LEGAL_HOLD_EDISCOVERY_EXPORT',
      details: { exports: exportRequests },
      createdAt: now(),
    });

    if (hold.eDiscovery) {
      hold.eDiscovery.latestCollections = exportRequests;
      await this.repository.update(holdId, {
        eDiscovery: hold.eDiscovery,
        updatedAt: now(),
      });
    }

    return exportRequests;
  }

  async runComplianceMonitoring(
    holdId: string,
  ): Promise<ComplianceCheckpoint[]> {
    const hold = await this.ensureHold(holdId);
    const checkpoints: ComplianceCheckpoint[] = [];
    const timestamp = now();

    // Custodian acknowledgement check
    const unacknowledged = hold.custodians.filter(
      (c) => c.status !== 'acknowledged',
    );
    checkpoints.push({
      checkId: 'custodian_acknowledgement',
      description: 'All custodians acknowledged legal hold',
      status: unacknowledged.length === 0 ? 'pass' : 'warning',
      details:
        unacknowledged.length === 0
          ? 'All custodians acknowledged'
          : `Pending custodians: ${unacknowledged.map((c) => c.id).join(', ')}`,
      timestamp,
    });

    // Connector preservation status check
    const failedConnectors = hold.connectors.filter(
      (c) => c.status === 'failed',
    );
    checkpoints.push({
      checkId: 'connector_preservation',
      description: 'All connectors successfully preserved data',
      status: failedConnectors.length === 0 ? 'pass' : 'fail',
      details:
        failedConnectors.length === 0
          ? 'All connectors succeeded'
          : `Failures: ${failedConnectors.map((c) => c.connectorId).join(', ')}`,
      timestamp,
    });

    // Lifecycle policy suspension check
    const unsuspendedPolicies = hold.lifecyclePolicies.filter(
      (policy) => !policy.suspensionApplied,
    );
    checkpoints.push({
      checkId: 'lifecycle_policy_suspension',
      description: 'Lifecycle policies suspended for legal hold duration',
      status: unsuspendedPolicies.length === 0 ? 'pass' : 'warning',
      details:
        unsuspendedPolicies.length === 0
          ? 'All linked policies suspended'
          : `Pending policies: ${unsuspendedPolicies.map((p) => p.policyId).join(', ')}`,
      timestamp,
    });

    for (const checkpoint of checkpoints) {
      await this.recordComplianceCheckpoint(holdId, checkpoint);
    }

    await this.appendAudit({
      holdId,
      caseId: hold.caseId,
      actorId: 'system',
      actorRole: 'automation',
      action: 'LEGAL_HOLD_COMPLIANCE_MONITORING',
      details: { checkpoints },
      createdAt: timestamp,
    });

    return checkpoints;
  }

  async releaseHold(
    holdId: string,
    actor: { id: string; role?: string },
    reason: string,
  ): Promise<void> {
    const hold = await this.ensureHold(holdId);
    for (const connectorResult of hold.connectors) {
      const connector = this.connectors.get(connectorResult.connectorId);
      if (!connector?.releaseHold) {
        continue;
      }
      try {
        await connector.releaseHold(holdId, hold.caseId);
      } catch (error) {
        logger.error(
          { err: error, connectorId: connectorResult.connectorId, holdId },
          'Failed to release legal hold from connector',
        );
      }
    }

    for (const custodian of hold.custodians) {
      await this.repository.recordCustodianStatus(
        holdId,
        custodian.id,
        'released',
        {
          releasedAt: now(),
          status: 'released',
        },
      );
    }

    await this.repository.update(holdId, {
      status: 'RELEASED',
      updatedAt: now(),
    });

    await this.appendAudit({
      holdId,
      caseId: hold.caseId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'LEGAL_HOLD_RELEASED',
      details: { reason },
      createdAt: now(),
    });
  }

  async generateAuditPackage(holdId: string): Promise<{
    hold: LegalHoldRecord;
    auditTrail: AuditTrailEntry[];
    custodyVerified: boolean;
  }> {
    const hold = await this.ensureHold(holdId);
    const auditTrail = await this.repository.listAudit(holdId);
    const custodyVerified = this.chainOfCustody
      ? await this.chainOfCustody.verify(hold.caseId)
      : false;
    return { hold, auditTrail, custodyVerified };
  }

  private async notifyCustodians(
    hold: LegalHoldRecord,
    templateId?: string,
  ): Promise<void> {
    if (!this.notificationDispatcher) {
      return;
    }

    try {
      const response = await this.notificationDispatcher.sendNotification({
        templateId,
        recipients: hold.custodians,
        channel: 'LEGAL_HOLD',
        data: {
          holdId: hold.holdId,
          holdName: hold.holdName,
          caseId: hold.caseId,
          reason: hold.reason,
        },
        priority: 'HIGH',
        metadata: { issuedBy: hold.issuedBy },
      });

      const notificationRecord: LegalHoldNotificationRecord = {
        notificationId: response.id,
        templateId,
        recipients: hold.custodians.map((c) => c.email),
        channel: 'LEGAL_HOLD',
        status: response.status,
        dispatchedAt: now(),
      };
      await this.repository.recordNotification(hold.holdId, notificationRecord);

      if (response.status === 'sent' || response.status === 'queued') {
        for (const custodian of hold.custodians) {
          await this.repository.recordCustodianStatus(
            hold.holdId,
            custodian.id,
            'notified',
            {
              status: 'notified',
              notifiedAt: now(),
            },
          );
        }
      }
    } catch (error) {
      logger.error(
        { err: error, holdId: hold.holdId },
        'Failed to send legal hold notifications',
      );
      await this.appendAudit({
        holdId: hold.holdId,
        caseId: hold.caseId,
        actorId: 'system',
        actorRole: 'automation',
        action: 'LEGAL_HOLD_NOTIFICATION_FAILED',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        createdAt: now(),
      });
    }
  }

  private resolveLifecyclePolicies(
    scope: LegalHoldRecord['scope'],
    overrides?: LifecyclePolicyLink[],
  ): LifecyclePolicyLink[] {
    const policies = new Map<string, LifecyclePolicyLink>();
    for (const policy of this.lifecyclePolicies) {
      policies.set(policy.policyId, { ...policy });
    }
    if (overrides) {
      for (const override of overrides) {
        policies.set(override.policyId, { ...override });
      }
    }
    // Ensure suspension applied flag defaults to true for connectors in scope
    for (const policy of policies.values()) {
      if (
        policy.suspensionApplied === undefined ||
        policy.suspensionApplied === false
      ) {
        policy.suspensionApplied = true;
        policy.notes = policy.notes
          ? `${policy.notes}; Auto-suspended for legal hold`
          : 'Auto-suspended for legal hold';
      }
    }
    // Add synthetic policy entries for connectors without explicit policy
    for (const connectorId of scope.connectors) {
      const syntheticPolicyId = `connector:${connectorId}`;
      if (!policies.has(syntheticPolicyId)) {
        policies.set(syntheticPolicyId, {
          policyId: syntheticPolicyId,
          policyName: `Connector ${connectorId} retention`,
          retentionDays: scope.retentionOverrideDays ?? 0,
          suspensionApplied: true,
          notes: 'Auto-generated connector policy override',
        });
      }
    }
    return Array.from(policies.values());
  }

  private async recordComplianceCheckpoint(
    holdId: string,
    checkpoint: ComplianceCheckpoint,
  ): Promise<void> {
    await this.repository.recordCompliance(holdId, checkpoint);
  }

  private async appendAudit(entry: AuditTrailEntry): Promise<void> {
    await this.repository.appendAudit(entry);
    await this.auditWriter(entry);
  }

  private async defaultAuditWriter(entry: AuditTrailEntry): Promise<void> {
    await writeAudit({
      userId: entry.actorId,
      action: entry.action,
      resourceType: 'legal_hold',
      resourceId: entry.holdId,
      details: {
        ...entry.details,
        caseId: entry.caseId,
      },
      actorRole: entry.actorRole,
    });
  }

  private async ensureHold(holdId: string): Promise<LegalHoldRecord> {
    const hold = await this.repository.getById(holdId);
    if (!hold) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    return hold;
  }
}

export class InMemoryLegalHoldRepository implements LegalHoldRepository {
  private readonly records = new Map<string, LegalHoldRecord>();
  private readonly verifications = new Map<
    string,
    PreservationVerificationResult[]
  >();
  private readonly compliance = new Map<string, ComplianceCheckpoint[]>();
  private readonly notifications = new Map<
    string,
    LegalHoldNotificationRecord[]
  >();
  private readonly audit = new Map<string, AuditTrailEntry[]>();

  async create(record: LegalHoldRecord): Promise<void> {
    this.records.set(record.holdId, cloneDeep(record));
    this.verifications.set(record.holdId, []);
    this.compliance.set(record.holdId, []);
    this.notifications.set(record.holdId, []);
    this.audit.set(record.holdId, []);
  }

  async update(
    holdId: string,
    update: Partial<LegalHoldRecord>,
  ): Promise<void> {
    const existing = this.records.get(holdId);
    if (!existing) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    const updated: LegalHoldRecord = {
      ...existing,
      ...cloneDeep(update),
      updatedAt: update.updatedAt ?? now(),
    };
    this.records.set(holdId, updated);
  }

  async getById(holdId: string): Promise<LegalHoldRecord | undefined> {
    const record = this.records.get(holdId);
    return record ? cloneDeep(record) : undefined;
  }

  async recordCustodianStatus(
    holdId: string,
    custodianId: string,
    status: CustodianStatus,
    metadata?: Partial<LegalHoldCustodian>,
  ): Promise<void> {
    const existing = this.records.get(holdId);
    if (!existing) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    existing.custodians = existing.custodians.map((custodian) =>
      custodian.id === custodianId
        ? {
            ...custodian,
            status,
            ...cloneDeep(metadata),
          }
        : custodian,
    );
    existing.updatedAt = now();
    this.records.set(holdId, existing);
  }

  async recordConnectorAction(
    holdId: string,
    result: PreservationHoldResult,
  ): Promise<void> {
    const existing = this.records.get(holdId);
    if (!existing) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    const connectors = existing.connectors.filter(
      (connector) => connector.connectorId !== result.connectorId,
    );
    connectors.push(cloneDeep(result));
    existing.connectors = connectors;
    existing.updatedAt = now();
    this.records.set(holdId, existing);
  }

  async recordVerification(
    holdId: string,
    verification: PreservationVerificationResult,
  ): Promise<void> {
    const list = this.verifications.get(holdId);
    if (!list) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    list.push(cloneDeep(verification));
  }

  async recordCompliance(
    holdId: string,
    checkpoint: ComplianceCheckpoint,
  ): Promise<void> {
    const list = this.compliance.get(holdId);
    if (!list) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    list.push(cloneDeep(checkpoint));
    const existing = this.records.get(holdId);
    if (existing) {
      existing.compliance = [...list];
      existing.updatedAt = now();
      this.records.set(holdId, existing);
    }
  }

  async recordNotification(
    holdId: string,
    notification: LegalHoldNotificationRecord,
  ): Promise<void> {
    const list = this.notifications.get(holdId);
    if (!list) {
      throw new Error(`Legal hold ${holdId} not found`);
    }
    list.push(cloneDeep(notification));
    const existing = this.records.get(holdId);
    if (existing) {
      existing.notifications = [...list];
      existing.updatedAt = now();
      this.records.set(holdId, existing);
    }
  }

  async appendAudit(entry: AuditTrailEntry): Promise<void> {
    const list = this.audit.get(entry.holdId);
    if (!list) {
      throw new Error(`Legal hold ${entry.holdId} not found`);
    }
    list.push(cloneDeep(entry));
  }

  async listAudit(holdId: string): Promise<AuditTrailEntry[]> {
    const list = this.audit.get(holdId) ?? [];
    return cloneDeep(list);
  }
}
