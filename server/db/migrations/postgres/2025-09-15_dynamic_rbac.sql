-- Dynamic RBAC configuration tables
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS rbac_assignments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS rbac_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed baseline permissions and roles if they do not exist
WITH perms AS (
  INSERT INTO rbac_permissions (name, description, category)
  SELECT p.name, p.description, p.category
  FROM (
    VALUES
      ('*', 'Full platform access wildcard', 'system'),
      ('rbac.manage', 'Manage RBAC configuration', 'admin'),
      ('query.investigations', 'Read investigations', 'investigation'),
      ('query.investigation', 'Read a single investigation', 'investigation'),
      ('query.entities', 'Read entities', 'entity'),
      ('query.relationships', 'Read relationships', 'relationship'),
      ('mutation.createInvestigation', 'Create investigations', 'investigation'),
      ('mutation.updateInvestigation', 'Update investigations', 'investigation'),
      ('mutation.createEntity', 'Create entities', 'entity'),
      ('mutation.updateEntity', 'Update entities', 'entity'),
      ('mutation.deleteEntity', 'Delete entities', 'entity'),
      ('mutation.createRelationship', 'Create relationships', 'relationship'),
      ('mutation.updateRelationship', 'Update relationships', 'relationship'),
      ('mutation.deleteRelationship', 'Delete relationships', 'relationship'),
      ('mutation.triggerN8n', 'Trigger n8n flows', 'integrations'),
      ('mutation.startRecipe', 'Start automation recipes', 'automation'),
      ('query.health', 'Read health checks', 'system'),
      ('query.graphNeighborhood', 'Explore graph neighborhoods', 'graph'),
      ('query.copilotRuns', 'Read Copilot runs', 'copilot'),
      ('mutation.startCopilotRun', 'Start Copilot run', 'copilot')
  ) AS p(name, description, category)
  ON CONFLICT (name) DO NOTHING
  RETURNING id, name
)
SELECT 1;

WITH roles AS (
  INSERT INTO rbac_roles (name, description, is_system)
  VALUES
    ('ADMIN', 'System administrator', TRUE),
    ('ANALYST', 'Graph analyst with authoring rights', TRUE),
    ('OPERATOR', 'Operations engineer for pipelines', TRUE),
    ('VIEWER', 'Read-only access', TRUE)
  ON CONFLICT (name) DO NOTHING
  RETURNING id, name
)
SELECT 1;

-- Map default permissions to roles
WITH perm_map AS (
  SELECT id, name FROM rbac_permissions
),
role_map AS (
  SELECT id, name FROM rbac_roles
),
role_perm(role_name, permission_name) AS (
  VALUES
    ('ADMIN', '*'),
    ('ADMIN', 'rbac.manage'),
    ('ANALYST', 'query.investigations'),
    ('ANALYST', 'query.investigation'),
    ('ANALYST', 'query.entities'),
    ('ANALYST', 'query.relationships'),
    ('ANALYST', 'mutation.createInvestigation'),
    ('ANALYST', 'mutation.updateInvestigation'),
    ('ANALYST', 'mutation.createEntity'),
    ('ANALYST', 'mutation.updateEntity'),
    ('ANALYST', 'mutation.deleteEntity'),
    ('ANALYST', 'mutation.createRelationship'),
    ('ANALYST', 'mutation.updateRelationship'),
    ('ANALYST', 'mutation.deleteRelationship'),
    ('ANALYST', 'query.graphNeighborhood'),
    ('ANALYST', 'query.copilotRuns'),
    ('ANALYST', 'mutation.startCopilotRun'),
    ('OPERATOR', 'query.investigations'),
    ('OPERATOR', 'query.entities'),
    ('OPERATOR', 'mutation.startRecipe'),
    ('OPERATOR', 'mutation.triggerN8n'),
    ('VIEWER', 'query.investigations'),
    ('VIEWER', 'query.investigation'),
    ('VIEWER', 'query.entities'),
    ('VIEWER', 'query.relationships'),
    ('VIEWER', 'query.health')
)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm rp
JOIN role_map r ON UPPER(r.name) = UPPER(rp.role_name)
JOIN perm_map p ON LOWER(p.name) = LOWER(rp.permission_name)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Initialize policy version row
INSERT INTO rbac_policy_versions (version, note)
VALUES (1, 'Initial dynamic RBAC bootstrap')
ON CONFLICT DO NOTHING;
