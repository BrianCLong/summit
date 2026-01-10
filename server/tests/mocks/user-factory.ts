type UserFactoryOptions = {
  id?: string;
  tenantId?: string;
  role?: string;
  roles?: string[];
};

export const userFactory = (options: UserFactoryOptions = {}) => {
  const roles = options.roles ?? (options.role ? [options.role] : ['viewer']);

  return {
    id: options.id ?? 'user-1',
    tenantId: options.tenantId ?? 'tenant-1',
    roles,
    residency: 'US',
    clearance: 'public',
    entitlements: [],
  };
};
