CREATE TABLE org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sso_mode TEXT NOT NULL DEFAULT 'optional' -- 'required'|'optional'
);

CREATE TABLE sso_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES org(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'saml'|'oidc'
  config JSONB NOT NULL, -- issuer, clientId, certs, acs, scopes, etc.
  active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scim_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE REFERENCES org(id) ON DELETE CASCADE,
  etag TEXT, cursor TEXT, last_sync TIMESTAMPTZ
);

CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES org(id) ON DELETE CASCADE,
  email CITEXT UNIQUE NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  attrs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE "group" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES org(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_id TEXT,
  UNIQUE(org_id, name)
);

CREATE TABLE membership (
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  group_id UUID REFERENCES "group"(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, group_id)
);

CREATE TABLE access_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES org(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  requested_roles TEXT[] NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'approved'|'denied'
  decided_by UUID, decided_at TIMESTAMPTZ
);
