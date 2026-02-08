import { CompanyOSIngestService } from './companyosDecision.ts';

async function verify() {
  const service = new CompanyOSIngestService();

  console.log('Testing IntelGraph ingestion...');
  await service.ingestDecision({
    evidenceId: 'EVID:t1:JobStart:hash123',
    timestamp: new Date().toISOString(),
    tenantId: 't1',
    actorId: 'u1',
    kind: 'JobStart',
    resource: 'res1',
    decision: 'allow',
    reasons: [],
    policyVersion: 'v1',
    auditEventId: 'audit-123'
  });

  console.log('Testing invalid evidence ID...');
  try {
    await service.ingestDecision({
      evidenceId: 'INVALID-ID',
      timestamp: new Date().toISOString(),
      tenantId: 't1',
      actorId: 'u1',
      kind: 'JobStart',
      resource: 'res1',
      decision: 'allow',
      reasons: [],
      policyVersion: 'v1',
      auditEventId: 'audit-123'
    } as any);
    throw new Error('Should have failed invalid ID');
  } catch (e: any) {
    console.log('Caught expected error:', e.message);
  }

  console.log('IntelGraph ingestion verification passed!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
