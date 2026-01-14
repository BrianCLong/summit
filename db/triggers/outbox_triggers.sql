-- Outbox trigger definitions (applied via migration 20260115_outbox.sql)

-- Users outbox trigger
CREATE OR REPLACE FUNCTION trg_users_outbox() RETURNS trigger AS $$
DECLARE
    v_event TEXT;
    v_version BIGINT;
    v_payload JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event := 'created';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'after', jsonb_build_object(
                'organization_id', NEW.organization_id,
                'name', NEW.name,
                'role', NEW.role,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.version := OLD.version + 1;
        v_event := 'updated';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'before', jsonb_build_object(
                'organization_id', OLD.organization_id,
                'name', OLD.name,
                'role', OLD.role,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            ),
            'after', jsonb_build_object(
                'organization_id', NEW.organization_id,
                'name', NEW.name,
                'role', NEW.role,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event := 'deleted';
        v_version := OLD.version + 1;
        v_payload := jsonb_build_object(
            'biz_id', OLD.biz_id,
            'before', jsonb_build_object(
                'organization_id', OLD.organization_id,
                'name', OLD.name,
                'role', OLD.role,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            )
        );
    END IF;

    INSERT INTO app_outbox (agg_type, agg_id, event_type, version, payload, headers)
    VALUES (
        'user',
        COALESCE(NEW.biz_id::text, OLD.biz_id::text),
        v_event,
        v_version,
        v_payload,
        jsonb_build_object('schema_ver', '1')
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_outbox_trg ON users;
CREATE TRIGGER users_outbox_trg
BEFORE INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION trg_users_outbox();

-- Organizations outbox trigger
CREATE OR REPLACE FUNCTION trg_organizations_outbox() RETURNS trigger AS $$
DECLARE
    v_event TEXT;
    v_version BIGINT;
    v_payload JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event := 'created';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'after', jsonb_build_object(
                'name', NEW.name,
                'slug', NEW.slug,
                'domain', NEW.domain,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.version := OLD.version + 1;
        v_event := 'updated';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'before', jsonb_build_object(
                'name', OLD.name,
                'slug', OLD.slug,
                'domain', OLD.domain,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            ),
            'after', jsonb_build_object(
                'name', NEW.name,
                'slug', NEW.slug,
                'domain', NEW.domain,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event := 'deleted';
        v_version := OLD.version + 1;
        v_payload := jsonb_build_object(
            'biz_id', OLD.biz_id,
            'before', jsonb_build_object(
                'name', OLD.name,
                'slug', OLD.slug,
                'domain', OLD.domain,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            )
        );
    END IF;

    INSERT INTO app_outbox (agg_type, agg_id, event_type, version, payload, headers)
    VALUES (
        'org',
        COALESCE(NEW.biz_id::text, OLD.biz_id::text),
        v_event,
        v_version,
        v_payload,
        jsonb_build_object('schema_ver', '1')
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_outbox_trg ON organizations;
CREATE TRIGGER organizations_outbox_trg
BEFORE INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE FUNCTION trg_organizations_outbox();

-- Projects outbox trigger
CREATE OR REPLACE FUNCTION trg_projects_outbox() RETURNS trigger AS $$
DECLARE
    v_event TEXT;
    v_version BIGINT;
    v_payload JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event := 'created';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'after', jsonb_build_object(
                'organization_id', NEW.organization_id,
                'name', NEW.name,
                'status', NEW.status,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.version := OLD.version + 1;
        v_event := 'updated';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'before', jsonb_build_object(
                'organization_id', OLD.organization_id,
                'name', OLD.name,
                'status', OLD.status,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            ),
            'after', jsonb_build_object(
                'organization_id', NEW.organization_id,
                'name', NEW.name,
                'status', NEW.status,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at,
                'deleted_at', NEW.deleted_at
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event := 'deleted';
        v_version := OLD.version + 1;
        v_payload := jsonb_build_object(
            'biz_id', OLD.biz_id,
            'before', jsonb_build_object(
                'organization_id', OLD.organization_id,
                'name', OLD.name,
                'status', OLD.status,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at,
                'deleted_at', OLD.deleted_at
            )
        );
    END IF;

    INSERT INTO app_outbox (agg_type, agg_id, event_type, version, payload, headers)
    VALUES (
        'project',
        COALESCE(NEW.biz_id::text, OLD.biz_id::text),
        v_event,
        v_version,
        v_payload,
        jsonb_build_object('schema_ver', '1')
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_outbox_trg ON projects;
CREATE TRIGGER projects_outbox_trg
BEFORE INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION trg_projects_outbox();

-- Project members outbox trigger (edge)
CREATE OR REPLACE FUNCTION trg_project_members_outbox() RETURNS trigger AS $$
DECLARE
    v_event TEXT;
    v_version BIGINT;
    v_payload JSONB;
    v_user_biz_id UUID;
    v_project_biz_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT biz_id INTO v_user_biz_id FROM users WHERE id = NEW.user_id;
        SELECT biz_id INTO v_project_biz_id FROM projects WHERE id = NEW.project_id;
        v_event := 'created';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'after', jsonb_build_object(
                'user_biz_id', v_user_biz_id,
                'project_biz_id', v_project_biz_id,
                'role', NEW.role,
                'created_at', NEW.created_at
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT biz_id INTO v_user_biz_id FROM users WHERE id = NEW.user_id;
        SELECT biz_id INTO v_project_biz_id FROM projects WHERE id = NEW.project_id;
        NEW.version := OLD.version + 1;
        v_event := 'updated';
        v_version := NEW.version;
        v_payload := jsonb_build_object(
            'biz_id', NEW.biz_id,
            'before', jsonb_build_object(
                'user_biz_id', v_user_biz_id,
                'project_biz_id', v_project_biz_id,
                'role', OLD.role,
                'created_at', OLD.created_at
            ),
            'after', jsonb_build_object(
                'user_biz_id', v_user_biz_id,
                'project_biz_id', v_project_biz_id,
                'role', NEW.role,
                'created_at', NEW.created_at
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        SELECT biz_id INTO v_user_biz_id FROM users WHERE id = OLD.user_id;
        SELECT biz_id INTO v_project_biz_id FROM projects WHERE id = OLD.project_id;
        v_event := 'deleted';
        v_version := OLD.version + 1;
        v_payload := jsonb_build_object(
            'biz_id', OLD.biz_id,
            'before', jsonb_build_object(
                'user_biz_id', v_user_biz_id,
                'project_biz_id', v_project_biz_id,
                'role', OLD.role,
                'created_at', OLD.created_at
            )
        );
    END IF;

    INSERT INTO app_outbox (agg_type, agg_id, event_type, version, payload, headers)
    VALUES (
        'edge.projectMember',
        COALESCE(NEW.biz_id::text, OLD.biz_id::text),
        v_event,
        v_version,
        v_payload,
        jsonb_build_object('schema_ver', '1')
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_members_outbox_trg ON project_members;
CREATE TRIGGER project_members_outbox_trg
BEFORE INSERT OR UPDATE OR DELETE ON project_members
FOR EACH ROW EXECUTE FUNCTION trg_project_members_outbox();
