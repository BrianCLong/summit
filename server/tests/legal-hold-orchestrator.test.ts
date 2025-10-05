import { LegalHoldOrchestrator, InMemoryLegalHoldRepository } from '../src/cases/legal-hold/orchestrator';
import {
  ChainOfCustodyAdapter,
  LegalHoldInitiationInput,
  LegalHoldNotificationDispatcher,
  PreservationConnector,
  PreservationDataScope,
  PreservationHoldInput,
  PreservationHoldResult,
  PreservationVerificationResult,
} from '../src/cases/legal-hold/types';

describe('LegalHoldOrchestrator', () => {
  const baseScope: PreservationDataScope = {
    connectors: ['s3-archive', 'o365'],
    dataSets: ['mailbox', 'drive'],
    searchTerms: ['contract', 'litigation'],
    retentionOverrideDays: 3650,
  };

  const baseInput: LegalHoldInitiationInput = {
    caseId: 'case-001',
    holdName: 'Contoso v. Northwind',
    reason: 'Pending litigation discovery obligations',
    issuedBy: {
      id: 'user-legal',
      name: 'Legal Ops',
      role: 'legal_admin',
    },
    custodians: [
      { id: 'cust-1', name: 'Alex Legal', email: 'alex@example.com' },
      { id: 'cust-2', name: 'Robin Compliance', email: 'robin@example.com' },
    ],
    scope: baseScope,
    notificationTemplateId: 'LEGAL_HOLD_NOTICE',
    eDiscovery: {
      enabled: true,
      exportFormats: ['pst', 'zip'],
      matterId: 'matter-42',
    },
  };

  let repository: InMemoryLegalHoldRepository;
  let connectors: FakeConnector[];
  let notificationDispatcher: MockNotificationDispatcher;
  let chainOfCustody: MockChainOfCustody;
  let orchestrator: LegalHoldOrchestrator;

  beforeEach(() => {
    repository = new InMemoryLegalHoldRepository();
    connectors = [
      new FakeConnector('s3-archive', { supportsVerification: true, supportsExport: true }),
      new FakeConnector('o365', { supportsVerification: true, supportsExport: true }),
    ];
    notificationDispatcher = new MockNotificationDispatcher();
    chainOfCustody = new MockChainOfCustody();
    orchestrator = new LegalHoldOrchestrator({
      repository,
      connectors,
      notificationDispatcher,
      chainOfCustody,
      lifecyclePolicies: [
        {
          policyId: 'retention-001',
          policyName: 'Default email retention',
          retentionDays: 365,
          suspensionApplied: false,
          notes: 'Baseline policy',
        },
      ],
      auditWriter: async () => {
        // swallow for tests
      },
    });
  });

  it('initiates legal hold across connectors with notifications and audit trail', async () => {
    const hold = await orchestrator.initiateHold(baseInput);

    expect(hold.status).toBe('ACTIVE');
    expect(connectors[0].applyHoldCalls).toBe(1);
    expect(connectors[1].applyHoldCalls).toBe(1);
    expect(notificationDispatcher.sent).toBe(1);
    expect(chainOfCustody.appended).toBe(1);

    const auditPackage = await orchestrator.generateAuditPackage(hold.holdId);
    expect(auditPackage.auditTrail.map((entry) => entry.action)).toContain('LEGAL_HOLD_INITIATED');
    expect(auditPackage.auditTrail.map((entry) => entry.action)).toContain(
      'LEGAL_HOLD_PRESERVATION_COMPLETE',
    );
  });

  it('verifies preservation state for connectors supporting verification', async () => {
    const hold = await orchestrator.initiateHold(baseInput);

    const verifications = await orchestrator.verifyPreservation(hold.holdId);
    expect(verifications).toHaveLength(2);
    expect(verifications.every((v) => v.verified)).toBe(true);
  });

  it('tracks custodian acknowledgement and compliance checkpoints', async () => {
    const hold = await orchestrator.initiateHold(baseInput);

    await orchestrator.recordCustodianAcknowledgement(hold.holdId, 'cust-1', {
      id: 'cust-1',
      role: 'employee',
    });

    const checkpoints = await orchestrator.runComplianceMonitoring(hold.holdId);
    const acknowledgementCheckpoint = checkpoints.find(
      (checkpoint) => checkpoint.checkId === 'custodian_acknowledgement',
    );
    expect(acknowledgementCheckpoint).toBeDefined();
    expect(acknowledgementCheckpoint?.status).toBe('warning');
  });

  it('collects e-discovery exports from connectors that support exports', async () => {
    const hold = await orchestrator.initiateHold(baseInput);

    const exports = await orchestrator.prepareEDiscoveryExport(hold.holdId, {
      exportFormat: 'pst',
      searchTerms: ['contract'],
    });

    expect(exports).toHaveLength(2);
    expect(exports.every((ex) => ex.exportPath.includes(hold.holdId))).toBe(true);
  });

  it('releases legal hold and updates statuses', async () => {
    const hold = await orchestrator.initiateHold(baseInput);
    await orchestrator.releaseHold(hold.holdId, { id: 'user-legal', role: 'legal_admin' }, 'Case closed');

    const released = await repository.getById(hold.holdId);
    expect(released?.status).toBe('RELEASED');
    expect(connectors.every((connector) => connector.releaseHoldCalls === 1)).toBe(true);
  });
});

class FakeConnector implements PreservationConnector {
  id: string;
  displayName: string;
  supportsVerification: boolean;
  supportsExport: boolean;
  applyHoldCalls = 0;
  releaseHoldCalls = 0;

  constructor(
    id: string,
    options: { supportsVerification?: boolean; supportsExport?: boolean } = {},
  ) {
    this.id = id;
    this.displayName = `${id} connector`;
    this.supportsVerification = options.supportsVerification ?? true;
    this.supportsExport = options.supportsExport ?? true;
  }

  async applyHold(input: PreservationHoldInput): Promise<PreservationHoldResult> {
    this.applyHoldCalls += 1;
    return {
      connectorId: this.id,
      referenceId: `${this.id}:${input.holdId}`,
      status: 'applied',
      location: `/preservation/${this.id}/${input.holdId}`,
    };
  }

  async verifyHold(
    holdId: string,
    _caseId: string,
    _scope: PreservationDataScope,
  ): Promise<PreservationVerificationResult> {
    return {
      connectorId: this.id,
      referenceId: `${this.id}:${holdId}`,
      verified: true,
      details: 'Retention lock active',
      checkedAt: new Date(),
    };
  }

  async collectPreservedData(
    request: EDiscoveryCollectionRequest,
  ): Promise<EDiscoveryCollectionResult> {
    if (!this.supportsExport) {
      throw new Error('Export not supported');
    }
    return {
      connectorId: this.id,
      exportPath: `/exports/${request.holdId}/${this.id}.${request.exportFormat ?? 'zip'}`,
      format: request.exportFormat ?? 'zip',
      itemCount: 42,
      generatedAt: new Date(),
    };
  }

  async releaseHold(_holdId: string, _caseId: string): Promise<void> {
    this.releaseHoldCalls += 1;
  }
}

class MockNotificationDispatcher implements LegalHoldNotificationDispatcher {
  sent = 0;

  async sendNotification(): Promise<{ id: string; status: 'queued' | 'sent' | 'failed' }> {
    this.sent += 1;
    return { id: `notif-${this.sent}`, status: 'sent' };
  }
}

class MockChainOfCustody implements ChainOfCustodyAdapter {
  appended = 0;

  async appendEvent(): Promise<string> {
    this.appended += 1;
    return `hash-${this.appended}`;
  }

  async verify(): Promise<boolean> {
    return true;
  }
}
