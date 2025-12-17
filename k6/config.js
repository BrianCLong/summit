
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  tenantId: __ENV.TENANT_ID || 'tenant-1',
  userId: __ENV.USER_ID || 'user-1',
  token: __ENV.TOKEN || 'dev-token',
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  duration: __ENV.DURATION || '1m',
};

export const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${config.token}`,
  'x-tenant-id': config.tenantId,
  'x-user-id': config.userId,
};
