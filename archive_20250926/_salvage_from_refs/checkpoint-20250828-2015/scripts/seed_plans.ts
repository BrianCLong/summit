import { Pool } from 'pg';
import { DEFAULT_PLANS } from '../server/src/entitlements/plans';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/testdb';
const pool = new Pool({ connectionString: DATABASE_URL });

async function seedPlans() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Plans
    console.log('Seeding plans...');
    for (const planId in DEFAULT_PLANS) {
      const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
      // Assign tiers: Starter=0, Pro=1, Enterprise=2, Trial=3
      let tier: number;
      switch (planId) {
        case 'starter': tier = 0; break;
        case 'pro': tier = 1; break;
        case 'enterprise': tier = 2; break;
        case 'trial': tier = 3; break;
        default: tier = 99; // Fallback for unknown plans
      }

      await client.query(
        'INSERT INTO plan (id, name, tier) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier = EXCLUDED.tier',
        [planId, planName, tier]
      );
      console.log(`  Upserted plan: ${planId}`);

      // 2. Seed Entitlements for each plan
      const entitlements = DEFAULT_PLANS[planId];
      for (const feature in entitlements) {
        const limits = entitlements[feature];
        await client.query(
          `INSERT INTO entitlement (plan_id, feature, limit_monthly, limit_daily, limit_rate_per_min)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (plan_id, feature) DO UPDATE SET
           limit_monthly = EXCLUDED.limit_monthly,
           limit_daily = EXCLUDED.limit_daily,
           limit_rate_per_min = EXCLUDED.limit_rate_per_min`,
          [planId, feature, limits.monthly, limits.daily, limits.ratePerMin]
        );
        console.log(`    Upserted entitlement for ${planId}: ${feature}`);
      }
    }

    // 3. Assign 'pro' plan to a sample tenant (tenant-t1) as requested in MVP-13
    const sampleTenantId = '00000000-0000-0000-0000-000000000001'; // Example tenant ID
    console.log(`Assigning 'pro' plan to tenant ${sampleTenantId}...`);
    await client.query(
      'INSERT INTO tenant_plan (tenant_id, plan_id) VALUES ($1, $2) ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id',
      [sampleTenantId, 'pro']
    );
    console.log(`  Tenant ${sampleTenantId} assigned 'pro' plan.`);

    // 4. Assign 'trial' plan to another sample tenant (tenant-t2) for trial mechanics
    const trialTenantId = '00000000-0000-0000-0000-000000000002'; // Another example tenant ID
    console.log(`Assigning 'trial' plan to tenant ${trialTenantId}...`);
    await client.query(
      'INSERT INTO tenant_plan (tenant_id, plan_id) VALUES ($1, $2) ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id',
      [trialTenantId, 'trial']
    );
    console.log(`  Tenant ${trialTenantId} assigned 'trial' plan.`);

    // 5. Grant some initial credits to a tenant (e.g., tenant-t1)
    console.log(`Granting initial credits to tenant ${sampleTenantId}...`);
    await client.query(
      `INSERT INTO credits (credit_id, tenant_id, reason, amount, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'a0000000-0000-0000-0000-000000000001', // Unique credit ID
        sampleTenantId,
        'Welcome Bonus',
        50.00,
        'USD',
        'seed-script'
      ]
    );
    console.log(`  Tenant ${sampleTenantId} granted 50.00 USD in credits.`);

    await client.query('COMMIT');
    console.log('Plan seeding complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding plans:', error);
    throw error;
  } finally {
    client.release();
  }
}

seedPlans().catch(err => {
  console.error('Failed to run plan seeding script:', err);
  process.exit(1);
});