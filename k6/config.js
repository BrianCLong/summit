
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:8080',
  tenantId: __ENV.TENANT_ID || 'tenant-1',
  userId: __ENV.USER_ID || 'user-1',
  token: __ENV.TOKEN || 'dev-token',
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be under 1%
    'http_req_duration{status:200}': ['p(95)<400'], // Successful requests should be faster
  },
};

export const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${config.token}`,
  'x-tenant-id': config.tenantId,
  'x-user-id': config.userId,
};
