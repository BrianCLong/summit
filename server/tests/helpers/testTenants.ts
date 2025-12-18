import { promises as fs } from 'fs';
import path from 'path';

type TenantRecord = { id: string; name: string; tier: 'dev' | 'stage' | 'prod' };

export const TEST_TENANT_FIXTURE = path.join(
  process.cwd(),
  'server',
  'test-results',
  'test-tenants.json',
);

const DEFAULT_TENANTS: TenantRecord[] = [
  { id: 'tenant-alpha', name: 'Tenant Alpha', tier: 'dev' },
  { id: 'tenant-beta', name: 'Tenant Beta', tier: 'stage' },
];

export async function seedTestTenants(overrides: TenantRecord[] = []): Promise<TenantRecord[]> {
  const tenants = dedupeTenants([...DEFAULT_TENANTS, ...overrides]);

  await fs.mkdir(path.dirname(TEST_TENANT_FIXTURE), { recursive: true });
  await fs.writeFile(TEST_TENANT_FIXTURE, JSON.stringify({ tenants }, null, 2), 'utf8');

  process.env.TEST_TENANT_FIXTURE = TEST_TENANT_FIXTURE;
  return tenants;
}

export async function teardownTestTenants(): Promise<void> {
  await fs.rm(TEST_TENANT_FIXTURE, { force: true });
}

function dedupeTenants(records: TenantRecord[]): TenantRecord[] {
  const uniqueById = new Map<string, TenantRecord>();
  records.forEach((record) => {
    uniqueById.set(record.id, record);
  });
  return Array.from(uniqueById.values());
}
