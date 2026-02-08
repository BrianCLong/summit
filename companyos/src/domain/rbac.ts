export interface Role {
  id: string;
  name: string;
  permissions: string[];
  tenantId: string;
}

export interface User {
  id: string;
  email: string;
  roles: string[];
  tenantId: string;
}
