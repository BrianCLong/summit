export const watermarkFixtures: Record<string, string> = {
  'valid-artifact': 'exportId=export-123;manifestHash=abcd1234;policyHash=policy-v1',
  'tampered-artifact': 'exportId=export-123;manifestHash=ffff0000;policyHash=policy-tampered'
};

export const manifestFixtures: Record<string, { manifestHash: string; policyHash: string }> = {
  'export-123': {
    manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98',
    policyHash: 'policy-v1'
  }
};

export const auditLedgerFixtures: Record<string, { exportId: string; policyHash: string; manifestHash: string }> = {
  'export-123': {
    exportId: 'export-123',
    policyHash: 'policy-v1',
    manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98'
  }
};
