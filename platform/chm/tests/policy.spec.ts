import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../src/config.js';
import { initSchema } from '../src/db.js';
import { createDocument, evaluateExport } from '../src/rules.js';
import { approveDowngrade, createDowngradeRequest } from '../src/workflows.js';
import { createMemoryPool } from './helpers/memory-db.js';

describe('policy conformance', () => {
  it('blocks export on residency and license violations and supports dual approval downgrade', async () => {
    const { pool } = createMemoryPool();
    await initSchema(pool);
    const config = loadConfig();
    config.residencyAllowList = ['US'];
    config.licenseAllowList = ['ITAR'];

    const blockedDocId = uuidv4();
    await createDocument(
      pool,
      {
        id: blockedDocId,
        title: 'foreign residency',
        classificationCode: 'S',
        residency: 'IR',
        license: 'ITAR',
        derivedFrom: false
      },
      'analyst'
    );

    const blockedDecision = await evaluateExport(pool, blockedDocId, config);
    expect(blockedDecision.allowed).toBe(false);
    expect(blockedDecision.reason).toContain('residency');

    const allowedId = uuidv4();
    await createDocument(
      pool,
      {
        id: allowedId,
        title: 'approved doc',
        classificationCode: 'C',
        residency: 'US',
        license: 'ITAR',
        derivedFrom: false
      },
      'analyst'
    );

    const allowedDecision = await evaluateExport(pool, allowedId, config);
    expect(allowedDecision.allowed).toBe(true);

    const requestId = await createDowngradeRequest(pool, {
      documentId: allowedId,
      requestedCode: 'U',
      justification: 'Release to partners',
      actor: 'requester'
    });

    const firstStatus = await approveDowngrade(pool, { requestId, approver: 'approver-a' });
    expect(firstStatus).toBe('waiting_second_approval');

    const finalStatus = await approveDowngrade(pool, { requestId, approver: 'approver-b' });
    expect(finalStatus).toBe('approved');

    const updated = await pool.query(`SELECT classification_code FROM documents WHERE id = $1`, [allowedId]);
    expect(updated.rows[0].classification_code).toBe('U');
  });
});
