import path from 'path';
import { ResidencyService } from '../services/ResidencyService';
import { ReplicationGuard } from '../services/ReplicationGuard';

describe('ReplicationGuard', () => {
  const residency = new ResidencyService(path.join(process.cwd(), 'config/residency/tenants.yaml'));
  const guard = new ReplicationGuard(residency);

  it('allows replication to permitted region', () => {
    expect(() => guard.enforce('tenantA', 'us-west')).not.toThrow();
  });

  it('blocks replication to disallowed region', () => {
    expect(() => guard.enforce('tenantB', 'us-west')).toThrow('residency_blocked');
  });
});
