import { CompanyOSClient } from '../../packages/companyos-sdk/src/index.ts';

async function bootstrap() {
  console.log('🚀 Bootstrapping companyOS: First Org + Golden Path');

  const baseUrl = process.env.COMPANYOS_BASE_URL || 'http://localhost:3000';
  const tenantId = 'default-tenant';

  async function post(path: string, body: any) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to post to ${path}: ${res.statusText}`);
    return res.json();
  }

  console.log('1. Creating Default Organization...');
  await post('/api/v1/orgs', { name: 'Default Org', tenantId });
  console.log('✅ Organization created:', tenantId);

  console.log('2. Seeding Roles (Admin, Analyst, Agent)...');
  await post('/api/v1/roles', { name: 'Analyst', permissions: ['read', 'execute'], tenantId });
  console.log('✅ Roles seeded.');

  console.log('3. Setting Budget Caps...');
  await post('/api/v1/budgets', { tenantId, limit: 1000, period: 'monthly' });
  console.log('✅ Budget cap set: $1000/mo');

  console.log('4. Applying Baseline Policies...');
  await post('/api/v1/policies', { name: 'baseline', rules: { allow: ['*'], deny: ['forbidden-*'] }, tenantId });
  console.log('✅ Baseline policy applied: v1.0.0');

  console.log('✨ companyOS Bootstrap Complete!');
}

bootstrap().catch(err => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
