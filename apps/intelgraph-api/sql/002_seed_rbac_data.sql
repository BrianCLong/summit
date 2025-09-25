-- Seed Permissions
INSERT INTO permission (name, description) VALUES
('policy:read', 'Read policies'),
('policy:write', 'Create/Update policies'),
('artifact:read', 'Read artifacts'),
('artifact:write', 'Create/Update artifacts'),
('user:read', 'Read user information'),
('user:write', 'Create/Update user information'),
('role:read', 'Read role information'),
('role:write', 'Create/Update role information'),
('permission:read', 'Read permission information'),
('permission:write', 'Create/Update permission information'),
('tenant:read', 'Read tenant information'),
('tenant:write', 'Create/Update tenant information'),
('org:read', 'Read organization information'),
('org:write', 'Create/Update organization information')
ON CONFLICT (name) DO NOTHING;

-- Seed Roles
INSERT INTO role (name) VALUES
('platform_admin'), -- Can manage across all tenants
('tenant_admin'),   -- Can manage within their tenant
('contributor'),    -- Can create/update data within their tenant
('viewer')          -- Can read data within their tenant
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Platform Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.name = 'platform_admin'
ON CONFLICT DO NOTHING;

-- Tenant Admin gets most permissions within their tenant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.name = 'tenant_admin' AND p.name IN (
    'policy:read', 'policy:write',
    'artifact:read', 'artifact:write',
    'user:read', 'user:write',
    'role:read', 'role:write',
    'permission:read',
    'tenant:read'
)
ON CONFLICT DO NOTHING;

-- Contributor gets read/write for data within their tenant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.name = 'contributor' AND p.name IN (
    'policy:read', 'policy:write',
    'artifact:read', 'artifact:write',
    'user:read'
)
ON CONFLICT DO NOTHING;

-- Viewer gets read-only access within their tenant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.name = 'viewer' AND p.name IN (
    'policy:read',
    'artifact:read',
    'user:read',
    'tenant:read'
)
ON CONFLICT DO NOTHING;

-- Example: Assign 'platform_admin' role to a default user if needed
-- This would typically be done via a separate user management process
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT (SELECT id FROM app_user WHERE email = 'admin@example.com'), (SELECT id FROM role WHERE name = 'platform_admin')
-- ON CONFLICT DO NOTHING;
