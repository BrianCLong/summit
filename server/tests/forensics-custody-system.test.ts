import { generateKeyPairSync } from 'crypto';
import {
  ForensicsCustodySystem,
  InMemoryCustodyLedger,
  InMemoryForensicsRepository,
} from '../src/cases/forensics-custody-system';

const fixedNow = () => new Date('2025-01-01T00:00:00.000Z');

describe('ForensicsCustodySystem', () => {
  it('tracks evidence integrity, access, legal holds, and compliance reporting', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const repository = new InMemoryForensicsRepository();
    const ledger = new InMemoryCustodyLedger();

    const custodySystem = new ForensicsCustodySystem({
      repository,
      ledger,
      signer: { privateKey, publicKey },
      now: fixedNow,
      legalHoldAdapter: {
        initiateHold: async (request) => ({
          ...request,
          holdId: 'hold-123',
          status: 'active',
          createdAt: fixedNow(),
          details: 'Legal hold applied via adapter',
        }),
      },
    });

    const evidence = await custodySystem.registerEvidence({
      id: 'ev-1',
      caseId: 'case-42',
      title: 'Disk image',
      collectedBy: 'analyst-7',
      content: Buffer.from('evidence-bytes'),
      metadata: { region: 'eu-west' },
    });

    expect(evidence.hash).toBe(
      'b73a0816db67716928e82b8cd4ea95200bc5942b709222e312c06265e4b16564',
    );

    await custodySystem.logAccess({
      evidenceId: evidence.id,
      caseId: evidence.caseId,
      actorId: 'reviewer-1',
      reason: 'triage-review',
      legalBasis: 'investigation',
      context: { source: 'timeline' },
    });

    const verification = await custodySystem.verifyEvidenceIntegrity(
      evidence.id,
      Buffer.from('evidence-bytes'),
    );
    expect(verification.verified).toBe(true);

    const hold = await custodySystem.placeLegalHold({
      evidenceId: evidence.id,
      caseId: evidence.caseId,
      holdName: 'Breach-Containment',
      reason: 'Regulator request',
      scope: ['mail', 'drive'],
      requestedBy: 'counsel-9',
    });
    expect(hold.status).toBe('active');

    const chainEvents = await ledger.list(evidence.id);
    expect(chainEvents).toHaveLength(4);
    expect(await custodySystem.verifyCustodyChain(evidence.id)).toBe(true);

    const report = await custodySystem.generateComplianceReport();
    expect(report.soc2.integrity.verified).toBe(2);
    expect(report.soc2.accessControls.justifiedEvents).toBe(1);
    expect(report.gdpr.legalHolds.active).toBe(1);
    expect(report.chainOfCustody.breakdown[0]).toMatchObject({
      evidenceId: evidence.id,
      verified: true,
    });
  });

  it('guards against duplicate evidence and case mismatches', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const repository = new InMemoryForensicsRepository();
    const ledger = new InMemoryCustodyLedger();

    const custodySystem = new ForensicsCustodySystem({
      repository,
      ledger,
      signer: { privateKey, publicKey },
      now: fixedNow,
    });

    await custodySystem.registerEvidence({
      id: 'ev-1',
      caseId: 'case-42',
      title: 'Disk image',
      collectedBy: 'analyst-7',
      content: Buffer.from('evidence-bytes'),
    });

    await expect(
      custodySystem.registerEvidence({
        id: 'ev-1',
        caseId: 'case-42',
        title: 'Duplicate disk image',
        collectedBy: 'analyst-7',
        content: Buffer.from('evidence-bytes'),
      }),
    ).rejects.toThrow('Evidence ev-1 already exists');

    await expect(
      custodySystem.logAccess({
        evidenceId: 'ev-1',
        caseId: 'case-999',
        actorId: 'reviewer-1',
        reason: 'triage-review',
        legalBasis: 'investigation',
      }),
    ).rejects.toThrow('Case mismatch for evidence ev-1: expected case-999, found case-42');

    await expect(
      custodySystem.placeLegalHold({
        evidenceId: 'ev-1',
        caseId: 'case-42',
        holdName: 'Breach-Containment',
        reason: 'Regulator request',
        scope: [],
        requestedBy: 'counsel-9',
      }),
    ).rejects.toThrow('Legal hold scope must include at least one target');
  });
});
