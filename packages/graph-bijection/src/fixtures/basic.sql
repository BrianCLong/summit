-- Bijection fixture seed (deterministic business IDs)

DELETE FROM project_members
WHERE biz_id IN (
  'b5aeb1b4-7d9e-4c95-8c45-efc7d8fb8b51'
);

DELETE FROM projects
WHERE biz_id IN (
  'c2f88c8e-9e26-4c57-9a9a-9f96a7a2c771'
);

DELETE FROM users
WHERE biz_id IN (
  '3d34c2b2-f33b-4c71-8b0c-5cbe9e9a3c6f'
)
OR email = 'bijection-user';

DELETE FROM organizations
WHERE biz_id IN (
  'e6efb760-2f1e-4b6d-b23c-6a0b5c8d3c94'
)
OR slug = 'bijection-org';

WITH org AS (
  INSERT INTO organizations (biz_id, name, slug, domain, created_at, updated_at)
  VALUES (
    'e6efb760-2f1e-4b6d-b23c-6a0b5c8d3c94',
    'Bijection Org',
    'bijection-org',
    'bijection.example',
    NOW(),
    NOW()
  )
  ON CONFLICT (biz_id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    domain = EXCLUDED.domain,
    updated_at = NOW()
  RETURNING id
), usr AS (
  INSERT INTO users (biz_id, organization_id, email, name, role, created_at, updated_at)
  SELECT
    '3d34c2b2-f33b-4c71-8b0c-5cbe9e9a3c6f',
    org.id,
    'bijection-user',
    'Bijection User',
    'admin',
    NOW(),
    NOW()
  FROM org
  ON CONFLICT (biz_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
  RETURNING id
), proj AS (
  INSERT INTO projects (biz_id, organization_id, name, status, created_by, created_at, updated_at)
  SELECT
    'c2f88c8e-9e26-4c57-9a9a-9f96a7a2c771',
    org.id,
    'Bijection Project',
    'active',
    usr.id,
    NOW(),
    NOW()
  FROM org, usr
  ON CONFLICT (biz_id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = NOW()
  RETURNING id
)
INSERT INTO project_members (biz_id, project_id, user_id, role, created_at)
SELECT
  'b5aeb1b4-7d9e-4c95-8c45-efc7d8fb8b51',
  proj.id,
  usr.id,
  'owner',
  NOW()
FROM proj, usr
ON CONFLICT (biz_id) DO UPDATE SET
  role = EXCLUDED.role;
