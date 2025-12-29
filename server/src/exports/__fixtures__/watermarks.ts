const watermarkRecord: Record<string, string> = {
  'valid-artifact': 'exportId=export-123;manifestHash=abcd1234;policyHash=policy-v1',
  'tampered-artifact': 'exportId=export-123;manifestHash=ffff0000;policyHash=policy-tampered',
};

const manifestRecord: Record<string, { manifestHash: string; policyHash: string }> = {
  'export-123': {
    manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98',
    policyHash: 'policy-v1',
  },
};

const auditLedgerRecord: Record<string, { exportId: string; policyHash: string; manifestHash: string }> = {
  'export-123': {
    exportId: 'export-123',
    policyHash: 'policy-v1',
    manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98',
  },
};

export const watermarkFixtures = Object.freeze({ ...watermarkRecord });
export const manifestFixtures = Object.freeze({ ...manifestRecord });
export const auditLedgerFixtures = Object.freeze({ ...auditLedgerRecord });
