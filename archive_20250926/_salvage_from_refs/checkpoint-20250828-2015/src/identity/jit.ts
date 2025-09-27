import { getTenantPlanLimits } from '../entitlements/plansService';
export async function jitProvision(orgId: string, email: string, profile: any) {
  if (!(await emailAllowed(orgId, email))) throw new Error('Email domain not allowed');
  const { seatsMax, seatsUsed } = await getSeatUsage(orgId);
  if (seatsUsed >= seatsMax) throw new Error('Seat limit reached (contact admin)');
  return await createUser(orgId, email, profile);
}
