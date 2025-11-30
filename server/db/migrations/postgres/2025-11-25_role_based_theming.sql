-- Role-Based UI Theming System
-- Migration: 2025-11-25_role_based_theming
-- Description: Dynamic theme customization based on user roles
--              Supports Material-UI theme overrides, hot reload, and versioning

-- ============================================================================
-- THEME DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ui_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Theme identification
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Theme targeting
  role VARCHAR(100), -- NULL = system default
  tenant_id VARCHAR(255), -- NULL = global theme

  -- Theme configuration (Material-UI theme object)
  theme_config JSONB NOT NULL,

  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(name, tenant_id),
  CHECK (theme_config IS NOT NULL AND jsonb_typeof(theme_config) = 'object')
);

CREATE INDEX idx_ui_themes_role ON ui_themes(role) WHERE is_active = true;
CREATE INDEX idx_ui_themes_tenant ON ui_themes(tenant_id) WHERE is_active = true;
CREATE INDEX idx_ui_themes_default ON ui_themes(is_default) WHERE is_default = true;

COMMENT ON TABLE ui_themes IS 'UI theme definitions with Material-UI configuration';
COMMENT ON COLUMN ui_themes.theme_config IS 'Complete MUI theme object as JSON';
COMMENT ON COLUMN ui_themes.role IS 'Role this theme applies to (NULL = system default)';
COMMENT ON COLUMN ui_themes.version IS 'Theme version for compatibility and rollback';

-- ============================================================================
-- USER THEME PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- Theme selection
  theme_id UUID REFERENCES ui_themes(id) ON DELETE SET NULL,

  -- Custom overrides (optional user customizations on top of theme)
  custom_overrides JSONB,

  -- Preferences
  auto_switch_by_role BOOLEAN NOT NULL DEFAULT true,
  dark_mode_preference VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_theme_prefs_user ON user_theme_preferences(user_id);
CREATE INDEX idx_user_theme_prefs_tenant ON user_theme_preferences(tenant_id);
CREATE INDEX idx_user_theme_prefs_theme ON user_theme_preferences(theme_id);

COMMENT ON TABLE user_theme_preferences IS 'Per-user theme preferences and overrides';
COMMENT ON COLUMN user_theme_preferences.custom_overrides IS 'User-specific theme customizations';
COMMENT ON COLUMN user_theme_preferences.auto_switch_by_role IS 'Automatically apply role-based theme';

-- ============================================================================
-- THEME COMPONENTS (Reusable theme fragments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS theme_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component identification
  component_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'color', 'typography', 'spacing', 'component'

  -- Component configuration
  component_config JSONB NOT NULL,

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theme_components_category ON theme_components(category) WHERE is_active = true;

COMMENT ON TABLE theme_components IS 'Reusable theme components for composition';
COMMENT ON COLUMN theme_components.category IS 'Component category for organization';

-- ============================================================================
-- THEME PRESETS (Quick theme variations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS theme_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Preset identification
  preset_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Base theme
  base_theme_id UUID REFERENCES ui_themes(id) ON DELETE CASCADE,

  -- Preset overrides
  preset_overrides JSONB NOT NULL,

  -- Categorization
  tags TEXT[],

  -- Metadata
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theme_presets_base_theme ON theme_presets(base_theme_id);
CREATE INDEX idx_theme_presets_public ON theme_presets(is_public) WHERE is_public = true;
CREATE INDEX idx_theme_presets_featured ON theme_presets(is_featured) WHERE is_featured = true;

COMMENT ON TABLE theme_presets IS 'Quick theme variations based on base themes';

-- ============================================================================
-- THEME AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS theme_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit details
  theme_id UUID REFERENCES ui_themes(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'activate', 'deactivate'
  changed_by VARCHAR(255) NOT NULL,

  -- Change tracking
  old_config JSONB,
  new_config JSONB,

  -- Metadata
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

CREATE INDEX idx_theme_audit_log_theme ON theme_audit_log(theme_id);
CREATE INDEX idx_theme_audit_log_timestamp ON theme_audit_log(timestamp DESC);

COMMENT ON TABLE theme_audit_log IS 'Audit trail for theme changes';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get effective theme for a user (considering role and preferences)
CREATE OR REPLACE FUNCTION get_effective_theme(
  p_user_id VARCHAR(255),
  p_tenant_id VARCHAR(255),
  p_user_role VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_theme_config JSONB;
  v_custom_overrides JSONB;
  v_auto_switch BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT
    utp.custom_overrides,
    utp.auto_switch_by_role
  INTO v_custom_overrides, v_auto_switch
  FROM user_theme_preferences utp
  WHERE utp.user_id = p_user_id AND utp.tenant_id = p_tenant_id;

  -- If user has explicit theme selection and auto-switch is off
  IF v_auto_switch = false THEN
    SELECT theme_config INTO v_theme_config
    FROM ui_themes ut
    JOIN user_theme_preferences utp ON ut.id = utp.theme_id
    WHERE utp.user_id = p_user_id AND utp.tenant_id = p_tenant_id
      AND ut.is_active = true;

    IF v_theme_config IS NOT NULL THEN
      -- Merge custom overrides if any
      IF v_custom_overrides IS NOT NULL THEN
        v_theme_config := v_theme_config || v_custom_overrides;
      END IF;
      RETURN v_theme_config;
    END IF;
  END IF;

  -- Get role-based theme
  IF p_user_role IS NOT NULL THEN
    SELECT theme_config INTO v_theme_config
    FROM ui_themes
    WHERE role = p_user_role
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
      AND is_active = true
    ORDER BY tenant_id DESC NULLS LAST -- Tenant-specific first
    LIMIT 1;

    IF v_theme_config IS NOT NULL THEN
      -- Merge custom overrides if any
      IF v_custom_overrides IS NOT NULL THEN
        v_theme_config := v_theme_config || v_custom_overrides;
      END IF;
      RETURN v_theme_config;
    END IF;
  END IF;

  -- Fall back to default theme
  SELECT theme_config INTO v_theme_config
  FROM ui_themes
  WHERE is_default = true
    AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
    AND is_active = true
  ORDER BY tenant_id DESC NULLS LAST
  LIMIT 1;

  -- Merge custom overrides if any
  IF v_custom_overrides IS NOT NULL THEN
    v_theme_config := v_theme_config || v_custom_overrides;
  END IF;

  RETURN v_theme_config;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_effective_theme IS 'Get the effective theme for a user considering role and preferences';

-- Audit theme changes trigger
CREATE OR REPLACE FUNCTION audit_theme_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO theme_audit_log (theme_id, action, changed_by, new_config)
    VALUES (NEW.id, 'create', NEW.created_by, NEW.theme_config);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO theme_audit_log (theme_id, action, changed_by, old_config, new_config)
    VALUES (NEW.id, 'update', NEW.updated_by, OLD.theme_config, NEW.theme_config);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO theme_audit_log (theme_id, action, changed_by, old_config)
    VALUES (OLD.id, 'delete', OLD.updated_by, OLD.theme_config);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_theme_changes
  AFTER INSERT OR UPDATE OR DELETE ON ui_themes
  FOR EACH ROW
  EXECUTE FUNCTION audit_theme_changes();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_theme_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ui_themes_updated_at
  BEFORE UPDATE ON ui_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_updated_at();

CREATE TRIGGER trg_user_theme_prefs_updated_at
  BEFORE UPDATE ON user_theme_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_updated_at();

-- ============================================================================
-- SEED DATA: DEFAULT THEMES
-- ============================================================================

-- System Default Theme (Light)
INSERT INTO ui_themes (name, display_name, description, theme_config, is_default, is_active) VALUES (
  'system_default',
  'IntelGraph Default',
  'Default light theme for IntelGraph platform',
  '{
    "palette": {
      "mode": "light",
      "primary": {
        "main": "#1976d2",
        "light": "#42a5f5",
        "dark": "#1565c0"
      },
      "secondary": {
        "main": "#9c27b0",
        "light": "#ba68c8",
        "dark": "#7b1fa2"
      },
      "error": {
        "main": "#d32f2f"
      },
      "warning": {
        "main": "#ed6c02"
      },
      "info": {
        "main": "#0288d1"
      },
      "success": {
        "main": "#2e7d32"
      },
      "background": {
        "default": "#fafafa",
        "paper": "#ffffff"
      }
    },
    "typography": {
      "fontFamily": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
      "h1": { "fontSize": "2.5rem", "fontWeight": 500 },
      "h2": { "fontSize": "2rem", "fontWeight": 500 },
      "h3": { "fontSize": "1.75rem", "fontWeight": 500 },
      "h4": { "fontSize": "1.5rem", "fontWeight": 500 },
      "h5": { "fontSize": "1.25rem", "fontWeight": 500 },
      "h6": { "fontSize": "1rem", "fontWeight": 500 }
    },
    "shape": {
      "borderRadius": 4
    },
    "spacing": 8
  }'::jsonb,
  true,
  true
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Security Analyst Theme (Dark with Red Accents)
INSERT INTO ui_themes (name, display_name, description, role, theme_config, is_active) VALUES (
  'security_analyst',
  'Security Analyst',
  'Dark theme optimized for security operations with red accents for alerts',
  'security_analyst',
  '{
    "palette": {
      "mode": "dark",
      "primary": {
        "main": "#f44336",
        "light": "#e57373",
        "dark": "#d32f2f"
      },
      "secondary": {
        "main": "#ff5722",
        "light": "#ff8a65",
        "dark": "#e64a19"
      },
      "error": {
        "main": "#f44336"
      },
      "warning": {
        "main": "#ff9800"
      },
      "info": {
        "main": "#2196f3"
      },
      "success": {
        "main": "#4caf50"
      },
      "background": {
        "default": "#121212",
        "paper": "#1e1e1e"
      },
      "text": {
        "primary": "#ffffff",
        "secondary": "#b0b0b0"
      }
    },
    "typography": {
      "fontFamily": "\"Roboto Mono\", monospace",
      "fontSize": 14
    },
    "shape": {
      "borderRadius": 2
    }
  }'::jsonb,
  true
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Compliance Officer Theme (Formal Light Blue)
INSERT INTO ui_themes (name, display_name, description, role, theme_config, is_active) VALUES (
  'compliance_officer',
  'Compliance Officer',
  'Professional light theme with blue accents for compliance work',
  'compliance_officer',
  '{
    "palette": {
      "mode": "light",
      "primary": {
        "main": "#0d47a1",
        "light": "#1976d2",
        "dark": "#01579b"
      },
      "secondary": {
        "main": "#546e7a",
        "light": "#78909c",
        "dark": "#37474f"
      },
      "background": {
        "default": "#f5f5f5",
        "paper": "#ffffff"
      }
    },
    "typography": {
      "fontFamily": "\"Inter\", \"Helvetica\", \"Arial\", sans-serif",
      "fontSize": 15
    },
    "shape": {
      "borderRadius": 8
    }
  }'::jsonb,
  true
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Executive Theme (Elegant with Purple Accents)
INSERT INTO ui_themes (name, display_name, description, role, theme_config, is_active) VALUES (
  'executive',
  'Executive Dashboard',
  'Elegant theme for executive dashboards with data visualization focus',
  'executive',
  '{
    "palette": {
      "mode": "light",
      "primary": {
        "main": "#5e35b1",
        "light": "#7e57c2",
        "dark": "#4527a0"
      },
      "secondary": {
        "main": "#00897b",
        "light": "#26a69a",
        "dark": "#00695c"
      },
      "background": {
        "default": "#ffffff",
        "paper": "#f9f9f9"
      }
    },
    "typography": {
      "fontFamily": "\"Lato\", \"Helvetica\", \"Arial\", sans-serif",
      "fontSize": 16,
      "h1": { "fontSize": "3rem", "fontWeight": 300 },
      "h2": { "fontSize": "2.5rem", "fontWeight": 300 }
    },
    "shape": {
      "borderRadius": 12
    }
  }'::jsonb,
  true
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Analyst Theme (Balanced Neutral)
INSERT INTO ui_themes (name, display_name, description, role, theme_config, is_active) VALUES (
  'analyst',
  'Intelligence Analyst',
  'Balanced theme for intelligence analysts with focus on data clarity',
  'analyst',
  '{
    "palette": {
      "mode": "light",
      "primary": {
        "main": "#1976d2",
        "light": "#42a5f5",
        "dark": "#1565c0"
      },
      "secondary": {
        "main": "#757575",
        "light": "#9e9e9e",
        "dark": "#616161"
      },
      "background": {
        "default": "#fafafa",
        "paper": "#ffffff"
      }
    },
    "typography": {
      "fontFamily": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
      "fontSize": 14
    },
    "shape": {
      "borderRadius": 4
    }
  }'::jsonb,
  true
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- ============================================================================
-- SEED DATA: THEME COMPONENTS
-- ============================================================================

INSERT INTO theme_components (component_name, display_name, description, category, component_config) VALUES
(
  'dark_mode_palette',
  'Dark Mode Color Palette',
  'Standard dark mode colors',
  'color',
  '{
    "palette": {
      "mode": "dark",
      "background": {
        "default": "#121212",
        "paper": "#1e1e1e"
      },
      "text": {
        "primary": "#ffffff",
        "secondary": "#b0b0b0"
      }
    }
  }'::jsonb
),
(
  'light_mode_palette',
  'Light Mode Color Palette',
  'Standard light mode colors',
  'color',
  '{
    "palette": {
      "mode": "light",
      "background": {
        "default": "#fafafa",
        "paper": "#ffffff"
      },
      "text": {
        "primary": "#000000",
        "secondary": "#666666"
      }
    }
  }'::jsonb
),
(
  'compact_spacing',
  'Compact Spacing',
  'Tighter spacing for dense UIs',
  'spacing',
  '{"spacing": 6}'::jsonb
),
(
  'comfortable_spacing',
  'Comfortable Spacing',
  'Standard comfortable spacing',
  'spacing',
  '{"spacing": 8}'::jsonb
),
(
  'spacious_layout',
  'Spacious Layout',
  'Generous spacing for executive views',
  'spacing',
  '{"spacing": 10}'::jsonb
)
ON CONFLICT (component_name) DO NOTHING;

-- ============================================================================
-- GRANTS (adjust based on your role setup)
-- ============================================================================

-- GRANT SELECT ON ui_themes TO app_user;
-- GRANT SELECT ON user_theme_preferences TO app_user;
-- GRANT SELECT ON theme_components TO app_user;
-- GRANT SELECT ON theme_presets TO app_user;
-- GRANT EXECUTE ON FUNCTION get_effective_theme TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON DATABASE CURRENT_DATABASE IS 'Role-based UI theming system installed';
