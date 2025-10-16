import { enforceABAC } from '../plugins/opaEnforcer';
export async function guardRead(
  ctx: any,
  resource: { tenant: string; labels?: string[]; retention?: string },
) {
  const jwt = ctx.user;
  await enforceABAC({
    jwt,
    resource,
    action: 'read',
    context: { country: ctx.country },
  });
}
