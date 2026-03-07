export const testUsers = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@summit.ai",
    password: process.env.TEST_ADMIN_PASSWORD || "password123",
    tenantId: "tenant-1",
  },
  analyst: {
    email: process.env.TEST_ANALYST_EMAIL || "analyst@summit.ai",
    password: process.env.TEST_ANALYST_PASSWORD || "password123",
    tenantId: "tenant-1",
  },
  otherTenantUser: {
    email: process.env.TEST_OTHER_USER_EMAIL || "user@other.ai",
    password: process.env.TEST_OTHER_USER_PASSWORD || "password123",
    tenantId: "tenant-2",
  },
};
