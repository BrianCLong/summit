-- OAuth2 and SAML 2.0 Authentication System
-- Migration: 2025-11-25_oauth2_saml_authentication
-- Description: Enterprise SSO with OAuth2 (Google, Microsoft, Okta, GitHub)
--              and SAML 2.0 (ADFS, OneLogin, Okta, Auth0)

-- ============================================================================
-- SSO PROVIDERS CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider identification
  provider_name VARCHAR(100) NOT NULL,
  provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('oauth2', 'saml')),
  display_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Tenant association
  tenant_id VARCHAR(255), -- NULL = global provider

  -- OAuth2 Configuration
  oauth2_config JSONB, -- {client_id, client_secret, auth_url, token_url, userinfo_url, scopes}

  -- SAML Configuration
  saml_config JSONB, -- {idp_entity_id, idp_sso_url, idp_slo_url, idp_cert, sp_entity_id}

  -- Attribute Mapping
  attribute_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Maps provider attributes to user fields: {email, firstName, lastName, groups, etc.}

  -- User Provisioning
  auto_provision_users BOOLEAN NOT NULL DEFAULT true,
  auto_update_users BOOLEAN NOT NULL DEFAULT true,
  default_role VARCHAR(100),
  role_mapping JSONB, -- Maps provider groups/roles to application roles

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(provider_name, tenant_id),
  CHECK (
    (provider_type = 'oauth2' AND oauth2_config IS NOT NULL) OR
    (provider_type = 'saml' AND saml_config IS NOT NULL)
  )
);

CREATE INDEX idx_sso_providers_tenant ON sso_providers(tenant_id) WHERE is_active = true;
CREATE INDEX idx_sso_providers_type ON sso_providers(provider_type) WHERE is_active = true;

COMMENT ON TABLE sso_providers IS 'SSO provider configurations for OAuth2 and SAML';
COMMENT ON COLUMN sso_providers.oauth2_config IS 'OAuth2 client credentials and endpoints';
COMMENT ON COLUMN sso_providers.saml_config IS 'SAML 2.0 IdP configuration';
COMMENT ON COLUMN sso_providers.attribute_mapping IS 'Map provider attributes to user fields';
COMMENT ON COLUMN sso_providers.role_mapping IS 'Map provider roles to application roles';

-- ============================================================================
-- FEDERATED IDENTITIES (Link external identities to local users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS federated_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Local user reference
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- External identity
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  external_user_id VARCHAR(500) NOT NULL, -- Provider's unique user ID
  external_username VARCHAR(255),
  external_email VARCHAR(255),

  -- Identity metadata
  identity_data JSONB, -- Raw data from provider (claims, attributes)

  -- Status
  is_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(provider_id, external_user_id),
  UNIQUE(user_id, provider_id) -- One identity per provider per user
);

CREATE INDEX idx_federated_identities_user ON federated_identities(user_id);
CREATE INDEX idx_federated_identities_tenant ON federated_identities(tenant_id);
CREATE INDEX idx_federated_identities_provider ON federated_identities(provider_id);
CREATE INDEX idx_federated_identities_external ON federated_identities(provider_id, external_user_id);

COMMENT ON TABLE federated_identities IS 'Links local users to external SSO identities';
COMMENT ON COLUMN federated_identities.external_user_id IS 'Unique user ID from the SSO provider (sub, nameID)';
COMMENT ON COLUMN federated_identities.identity_data IS 'Full identity data from provider';

-- ============================================================================
-- SSO SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session identification
  session_token VARCHAR(500) UNIQUE NOT NULL,
  refresh_token VARCHAR(500),

  -- User and provider
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  federated_identity_id UUID NOT NULL REFERENCES federated_identities(id) ON DELETE CASCADE,

  -- OAuth2 tokens
  access_token TEXT, -- OAuth2 access token (encrypted)
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_data TEXT, -- OAuth2 refresh token (encrypted)

  -- SAML session
  saml_session_index VARCHAR(500),
  saml_name_id VARCHAR(500),

  -- Session metadata
  user_agent TEXT,
  ip_address INET,
  geolocation JSONB,

  -- Session lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason VARCHAR(255)
);

CREATE INDEX idx_sso_sessions_token ON sso_sessions(session_token) WHERE revoked_at IS NULL;
CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_sso_sessions_provider ON sso_sessions(provider_id);

COMMENT ON TABLE sso_sessions IS 'Active SSO sessions with token management';
COMMENT ON COLUMN sso_sessions.access_token IS 'Encrypted OAuth2 access token';
COMMENT ON COLUMN sso_sessions.saml_session_index IS 'SAML SessionIndex for single logout';

-- ============================================================================
-- SSO AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'token_refresh', 'link_identity', 'provider_configured'
  event_status VARCHAR(50) NOT NULL, -- 'success', 'failure', 'error'

  -- Actor
  user_id VARCHAR(255),
  tenant_id VARCHAR(255),
  provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,

  -- Event data
  event_data JSONB,
  error_message TEXT,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sso_audit_log_user ON sso_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_sso_audit_log_tenant ON sso_audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_sso_audit_log_provider ON sso_audit_log(provider_id, timestamp DESC);
CREATE INDEX idx_sso_audit_log_timestamp ON sso_audit_log(timestamp DESC);

COMMENT ON TABLE sso_audit_log IS 'Comprehensive audit trail for SSO operations';

-- ============================================================================
-- SSO METADATA CACHE (SAML IdP Metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS saml_idp_metadata_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider reference
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,

  -- Metadata
  metadata_xml TEXT NOT NULL,
  metadata_url VARCHAR(2000),

  -- Parsed metadata
  entity_id VARCHAR(500),
  sso_url VARCHAR(2000),
  slo_url VARCHAR(2000),
  certificates TEXT[], -- Array of X.509 certificates

  -- Cache metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  is_valid BOOLEAN NOT NULL DEFAULT true,

  UNIQUE(provider_id)
);

CREATE INDEX idx_saml_metadata_provider ON saml_idp_metadata_cache(provider_id);

COMMENT ON TABLE saml_idp_metadata_cache IS 'Cached SAML IdP metadata for performance';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get active SSO providers for a tenant
CREATE OR REPLACE FUNCTION get_active_sso_providers(p_tenant_id VARCHAR(255))
RETURNS TABLE (
  id UUID,
  provider_name VARCHAR(100),
  provider_type VARCHAR(50),
  display_name VARCHAR(255),
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sso.id,
    sso.provider_name,
    sso.provider_type,
    sso.display_name,
    sso.is_default
  FROM sso_providers sso
  WHERE sso.is_active = true
    AND (sso.tenant_id = p_tenant_id OR sso.tenant_id IS NULL)
  ORDER BY sso.is_default DESC, sso.display_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_sso_providers IS 'Get active SSO providers for a tenant';

-- Link or create federated identity
CREATE OR REPLACE FUNCTION upsert_federated_identity(
  p_user_id VARCHAR(255),
  p_tenant_id VARCHAR(255),
  p_provider_id UUID,
  p_external_user_id VARCHAR(500),
  p_external_username VARCHAR(255),
  p_external_email VARCHAR(255),
  p_identity_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_identity_id UUID;
BEGIN
  INSERT INTO federated_identities (
    user_id, tenant_id, provider_id, external_user_id,
    external_username, external_email, identity_data, is_verified
  ) VALUES (
    p_user_id, p_tenant_id, p_provider_id, p_external_user_id,
    p_external_username, p_external_email, p_identity_data, true
  )
  ON CONFLICT (provider_id, external_user_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    external_username = EXCLUDED.external_username,
    external_email = EXCLUDED.external_email,
    identity_data = EXCLUDED.identity_data,
    last_login_at = NOW(),
    login_count = federated_identities.login_count + 1,
    updated_at = NOW()
  RETURNING id INTO v_identity_id;

  RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_federated_identity IS 'Create or update federated identity on login';

-- Revoke SSO session
CREATE OR REPLACE FUNCTION revoke_sso_session(
  p_session_token VARCHAR(500),
  p_revocation_reason VARCHAR(255) DEFAULT 'manual_revocation'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE sso_sessions
  SET
    revoked_at = NOW(),
    revocation_reason = p_revocation_reason
  WHERE session_token = p_session_token
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_updated = FOUND;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION revoke_sso_session IS 'Revoke an active SSO session';

-- Cleanup expired sessions (call from cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE sso_sessions
  SET
    revoked_at = NOW(),
    revocation_reason = 'expired'
  WHERE expires_at < NOW()
    AND revoked_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sso_sessions IS 'Cleanup expired SSO sessions';

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_sso_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sso_providers_updated_at
  BEFORE UPDATE ON sso_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_updated_at();

CREATE TRIGGER trg_federated_identities_updated_at
  BEFORE UPDATE ON federated_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_updated_at();

-- Audit SSO provider changes
CREATE OR REPLACE FUNCTION audit_sso_provider_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sso_audit_log (event_type, event_status, user_id, tenant_id, provider_id, event_data)
    VALUES ('provider_configured', 'success', NEW.created_by, NEW.tenant_id, NEW.id, jsonb_build_object('provider_name', NEW.provider_name));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO sso_audit_log (event_type, event_status, user_id, tenant_id, provider_id, event_data)
    VALUES ('provider_updated', 'success', NEW.updated_by, NEW.tenant_id, NEW.id, jsonb_build_object('provider_name', NEW.provider_name));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO sso_audit_log (event_type, event_status, user_id, tenant_id, provider_id, event_data)
    VALUES ('provider_deleted', 'success', OLD.updated_by, OLD.tenant_id, OLD.id, jsonb_build_object('provider_name', OLD.provider_name));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_sso_provider_changes
  AFTER INSERT OR UPDATE OR DELETE ON sso_providers
  FOR EACH ROW
  EXECUTE FUNCTION audit_sso_provider_changes();

-- ============================================================================
-- SEED DATA: COMMON SSO PROVIDERS
-- ============================================================================

-- Google OAuth2
INSERT INTO sso_providers (
  provider_name,
  provider_type,
  display_name,
  description,
  oauth2_config,
  attribute_mapping,
  auto_provision_users
) VALUES (
  'google',
  'oauth2',
  'Google',
  'Sign in with Google',
  '{
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
    "scopes": ["openid", "email", "profile"]
  }'::jsonb,
  '{
    "email": "email",
    "firstName": "given_name",
    "lastName": "family_name",
    "avatar": "picture"
  }'::jsonb,
  true
) ON CONFLICT (provider_name, tenant_id) DO NOTHING;

-- Microsoft OAuth2
INSERT INTO sso_providers (
  provider_name,
  provider_type,
  display_name,
  description,
  oauth2_config,
  attribute_mapping,
  auto_provision_users
) VALUES (
  'microsoft',
  'oauth2',
  'Microsoft',
  'Sign in with Microsoft',
  '{
    "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "userinfo_url": "https://graph.microsoft.com/v1.0/me",
    "scopes": ["openid", "email", "profile", "User.Read"]
  }'::jsonb,
  '{
    "email": "mail",
    "firstName": "givenName",
    "lastName": "surname",
    "username": "userPrincipalName"
  }'::jsonb,
  true
) ON CONFLICT (provider_name, tenant_id) DO NOTHING;

-- GitHub OAuth2
INSERT INTO sso_providers (
  provider_name,
  provider_type,
  display_name,
  description,
  oauth2_config,
  attribute_mapping,
  auto_provision_users
) VALUES (
  'github',
  'oauth2',
  'GitHub',
  'Sign in with GitHub',
  '{
    "auth_url": "https://github.com/login/oauth/authorize",
    "token_url": "https://github.com/login/oauth/access_token",
    "userinfo_url": "https://api.github.com/user",
    "scopes": ["read:user", "user:email"]
  }'::jsonb,
  '{
    "email": "email",
    "username": "login",
    "firstName": "name",
    "avatar": "avatar_url"
  }'::jsonb,
  true
) ON CONFLICT (provider_name, tenant_id) DO NOTHING;

-- ============================================================================
-- GRANTS (adjust based on your role setup)
-- ============================================================================

-- GRANT SELECT ON sso_providers TO app_user;
-- GRANT SELECT ON federated_identities TO app_user;
-- GRANT SELECT ON sso_sessions TO app_user;
-- GRANT EXECUTE ON FUNCTION get_active_sso_providers TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON DATABASE CURRENT_DATABASE IS 'OAuth2 and SAML 2.0 authentication system installed';
