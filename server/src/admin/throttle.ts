export function checkThrottle(ctx: any, op:'ANALYTICS'|'EXPORT'|'JOB'): {allowed:boolean, reason?:string} {
  // Simple check against tenant config
  // In a real app, ctx.metrics would provide real-time counts from Redis

  const tenant = ctx.tenant || {};
  const throttles = tenant.throttles || {};
  const cap = throttles[op] ?? Infinity;

  // Mock current usage for now
  const currentUsage = ctx.metrics?.inFlight?.[op] ?? 0;

  if (currentUsage >= cap) {
    return { allowed: false, reason: `${op}_THROTTLED` };
  }

  return { allowed: true };
}
