import { guard } from '../federation/cleanroom/Guard';
import { CleanRoomManifest } from '../federation/cleanroom/Manifest';

describe('clean room guard', () => {
  const manifest: CleanRoomManifest = {
    id: 'm1',
    tenants: ['t1'],
    datasets: [],
    allowedQueries: ['Allowed'],
    retentionDays: 1,
    piiOff: true,
    signedAt: '',
    signer: '',
    signature: ''
  };
  it('allows whitelisted query', async () => {
    await expect(guard(manifest, 'Allowed', { tenantId: 't1', residency: 'us-west', auth: {}, flags: {} })).resolves.toBeUndefined();
  });
  it('blocks disallowed query', async () => {
    await expect(guard(manifest, 'Bad', { tenantId: 't1', residency: 'us-west', auth: {}, flags: {} })).rejects.toThrow();
  });
});
