/**
 * Theme Service
 * Handles theme CRUD operations, resolution, and validation
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  UITheme,
  UserThemePreference,
  ThemeConfig,
  CreateThemeInput,
  UpdateThemeInput,
  UpdateUserThemePreferenceInput,
  EffectiveThemeResult,
  ThemeResolutionContext,
  ThemeValidationResult,
  ThemeDiff,
} from './theme-types.js';
import {
  UIThemeSchema,
  UserThemePreferenceSchema,
  ThemeConfigSchema,
  CreateThemeInputSchema,
  UpdateThemeInputSchema,
  UpdateUserThemePreferenceInputSchema,
} from './theme-types.js';

export class ThemeService {
  constructor(private db: Pool) {}

  // =========================================================================
  // THEME CRUD OPERATIONS
  // =========================================================================

  /**
   * Create a new theme
   */
  async createTheme(
    input: CreateThemeInput,
    created_by: string
  ): Promise<UITheme> {
    // Validate input
    const validated = CreateThemeInputSchema.parse(input);

    // Validate theme config
    const validation = this.validateThemeConfig(validated.theme_config);
    if (!validation.valid) {
      throw new Error(
        `Invalid theme configuration: ${validation.errors.join(', ')}`
      );
    }

    // If setting as default, unset other defaults
    if (validated.is_default) {
      await this.db.query(
        `UPDATE ui_themes
         SET is_default = false
         WHERE (tenant_id = $1 OR (tenant_id IS NULL AND $1 IS NULL))`,
        [validated.tenant_id || null]
      );
    }

    const result = await this.db.query(
      `INSERT INTO ui_themes (
        name, display_name, description, role, tenant_id,
        theme_config, is_active, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        validated.name,
        validated.display_name,
        validated.description || null,
        validated.role || null,
        validated.tenant_id || null,
        JSON.stringify(validated.theme_config),
        validated.is_active !== false,
        validated.is_default || false,
        created_by,
      ]
    );

    return UIThemeSchema.parse(result.rows[0]);
  }

  /**
   * Get theme by ID
   */
  async getThemeById(theme_id: string): Promise<UITheme | null> {
    const result = await this.db.query(
      `SELECT * FROM ui_themes WHERE id = $1`,
      [theme_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return UIThemeSchema.parse(result.rows[0]);
  }

  /**
   * Get theme by name
   */
  async getThemeByName(
    name: string,
    tenant_id?: string
  ): Promise<UITheme | null> {
    const result = await this.db.query(
      `SELECT * FROM ui_themes
       WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY tenant_id DESC NULLS LAST
       LIMIT 1`,
      [name, tenant_id || null]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return UIThemeSchema.parse(result.rows[0]);
  }

  /**
   * List all themes
   */
  async listThemes(filters?: {
    role?: string;
    tenant_id?: string;
    is_active?: boolean;
  }): Promise<UITheme[]> {
    let query = `SELECT * FROM ui_themes WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.role !== undefined) {
      query += ` AND (role = $${paramIndex} OR role IS NULL)`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.tenant_id !== undefined) {
      query += ` AND (tenant_id = $${paramIndex} OR tenant_id IS NULL)`;
      params.push(filters.tenant_id);
      paramIndex++;
    }

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows.map((row) => UIThemeSchema.parse(row));
  }

  /**
   * Update theme
   */
  async updateTheme(
    theme_id: string,
    input: UpdateThemeInput,
    updated_by: string
  ): Promise<UITheme> {
    const validated = UpdateThemeInputSchema.parse(input);

    // Validate theme config if provided
    if (validated.theme_config) {
      const validation = this.validateThemeConfig(validated.theme_config);
      if (!validation.valid) {
        throw new Error(
          `Invalid theme configuration: ${validation.errors.join(', ')}`
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex}`);
      params.push(validated.display_name);
      paramIndex++;
    }

    if (validated.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(validated.description);
      paramIndex++;
    }

    if (validated.theme_config !== undefined) {
      updates.push(`theme_config = $${paramIndex}`);
      params.push(JSON.stringify(validated.theme_config));
      paramIndex++;
      // Increment version
      updates.push(`version = version + 1`);
    }

    if (validated.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(validated.is_active);
      paramIndex++;
    }

    if (validated.is_default !== undefined) {
      updates.push(`is_default = $${paramIndex}`);
      params.push(validated.is_default);
      paramIndex++;

      // If setting as default, unset others
      if (validated.is_default) {
        const themeResult = await this.db.query(
          `SELECT tenant_id FROM ui_themes WHERE id = $1`,
          [theme_id]
        );
        if (themeResult.rows.length > 0) {
          const tenant_id = themeResult.rows[0].tenant_id;
          await this.db.query(
            `UPDATE ui_themes
             SET is_default = false
             WHERE id != $1 AND (tenant_id = $2 OR (tenant_id IS NULL AND $2 IS NULL))`,
            [theme_id, tenant_id]
          );
        }
      }
    }

    updates.push(`updated_by = $${paramIndex}`);
    params.push(updated_by);
    paramIndex++;

    updates.push(`updated_at = NOW()`);

    params.push(theme_id);
    const result = await this.db.query(
      `UPDATE ui_themes
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error(`Theme not found: ${theme_id}`);
    }

    return UIThemeSchema.parse(result.rows[0]);
  }

  /**
   * Delete theme
   */
  async deleteTheme(theme_id: string, deleted_by: string): Promise<boolean> {
    // Check if theme is default
    const themeResult = await this.db.query(
      `SELECT is_default FROM ui_themes WHERE id = $1`,
      [theme_id]
    );

    if (themeResult.rows.length === 0) {
      return false;
    }

    if (themeResult.rows[0].is_default) {
      throw new Error('Cannot delete default theme');
    }

    // Soft delete: set is_active = false
    await this.db.query(
      `UPDATE ui_themes
       SET is_active = false, updated_by = $2, updated_at = NOW()
       WHERE id = $1`,
      [theme_id, deleted_by]
    );

    // Update user preferences referencing this theme to NULL
    await this.db.query(
      `UPDATE user_theme_preferences
       SET theme_id = NULL, updated_at = NOW()
       WHERE theme_id = $1`,
      [theme_id]
    );

    return true;
  }

  // =========================================================================
  // THEME RESOLUTION
  // =========================================================================

  /**
   * Get effective theme for a user
   */
  async getEffectiveTheme(
    context: ThemeResolutionContext
  ): Promise<EffectiveThemeResult> {
    // Use database function for efficient resolution
    const result = await this.db.query(
      `SELECT
         get_effective_theme($1, $2, $3) as theme_config,
         ut.id as theme_id,
         ut.name as theme_name
       FROM user_theme_preferences utp
       LEFT JOIN ui_themes ut ON utp.theme_id = ut.id
       WHERE utp.user_id = $1 AND utp.tenant_id = $2
       LIMIT 1`,
      [context.userId, context.tenantId, context.userRole || null]
    );

    let theme_config: ThemeConfig;
    let source: 'user_preference' | 'role_based' | 'default';
    let theme_id: string | undefined;
    let theme_name: string | undefined;

    if (result.rows.length > 0 && result.rows[0].theme_config) {
      theme_config = result.rows[0].theme_config;
      theme_id = result.rows[0].theme_id;
      theme_name = result.rows[0].theme_name;

      // Determine source
      const prefs = await this.getUserThemePreference(
        context.userId,
        context.tenantId
      );
      if (prefs && !prefs.auto_switch_by_role && prefs.theme_id) {
        source = 'user_preference';
      } else if (context.userRole) {
        source = 'role_based';
      } else {
        source = 'default';
      }
    } else {
      // Fallback: call function directly
      const fallbackResult = await this.db.query(
        `SELECT get_effective_theme($1, $2, $3) as theme_config`,
        [context.userId, context.tenantId, context.userRole || null]
      );

      theme_config = fallbackResult.rows[0]?.theme_config || {};
      source = 'default';
    }

    // Apply dark mode preference if system mode
    const prefs = await this.getUserThemePreference(
      context.userId,
      context.tenantId
    );
    if (prefs && prefs.dark_mode_preference !== 'system') {
      if (!theme_config.palette) {
        theme_config.palette = {};
      }
      theme_config.palette.mode =
        prefs.dark_mode_preference as 'light' | 'dark';
    } else if (context.systemDarkMode !== undefined) {
      if (!theme_config.palette) {
        theme_config.palette = {};
      }
      theme_config.palette.mode = context.systemDarkMode ? 'dark' : 'light';
    }

    return {
      theme: theme_config,
      source,
      theme_id,
      theme_name,
    };
  }

  // =========================================================================
  // USER PREFERENCES
  // =========================================================================

  /**
   * Get user theme preference
   */
  async getUserThemePreference(
    user_id: string,
    tenant_id: string
  ): Promise<UserThemePreference | null> {
    const result = await this.db.query(
      `SELECT * FROM user_theme_preferences
       WHERE user_id = $1 AND tenant_id = $2`,
      [user_id, tenant_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return UserThemePreferenceSchema.parse(result.rows[0]);
  }

  /**
   * Update user theme preference
   */
  async updateUserThemePreference(
    user_id: string,
    tenant_id: string,
    input: UpdateUserThemePreferenceInput
  ): Promise<UserThemePreference> {
    const validated = UpdateUserThemePreferenceInputSchema.parse(input);

    // Validate custom overrides if provided
    if (validated.custom_overrides) {
      const validation = this.validateThemeConfig(validated.custom_overrides);
      if (!validation.valid) {
        throw new Error(
          `Invalid custom overrides: ${validation.errors.join(', ')}`
        );
      }
    }

    // Verify theme exists if provided
    if (validated.theme_id) {
      const theme = await this.getThemeById(validated.theme_id);
      if (!theme || !theme.is_active) {
        throw new Error(`Theme not found or inactive: ${validated.theme_id}`);
      }
    }

    // Upsert preference
    const result = await this.db.query(
      `INSERT INTO user_theme_preferences (
        user_id, tenant_id, theme_id, custom_overrides,
        auto_switch_by_role, dark_mode_preference
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, tenant_id)
      DO UPDATE SET
        theme_id = COALESCE(EXCLUDED.theme_id, user_theme_preferences.theme_id),
        custom_overrides = COALESCE(EXCLUDED.custom_overrides, user_theme_preferences.custom_overrides),
        auto_switch_by_role = COALESCE(EXCLUDED.auto_switch_by_role, user_theme_preferences.auto_switch_by_role),
        dark_mode_preference = COALESCE(EXCLUDED.dark_mode_preference, user_theme_preferences.dark_mode_preference),
        updated_at = NOW()
      RETURNING *`,
      [
        user_id,
        tenant_id,
        validated.theme_id || null,
        validated.custom_overrides
          ? JSON.stringify(validated.custom_overrides)
          : null,
        validated.auto_switch_by_role !== undefined
          ? validated.auto_switch_by_role
          : null,
        validated.dark_mode_preference || null,
      ]
    );

    return UserThemePreferenceSchema.parse(result.rows[0]);
  }

  // =========================================================================
  // THEME VALIDATION
  // =========================================================================

  /**
   * Validate theme configuration
   */
  validateThemeConfig(config: ThemeConfig): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate against schema
      ThemeConfigSchema.parse(config);

      // Additional validation rules
      if (config.palette) {
        // Validate color formats
        const colorFields = [
          config.palette.primary?.main,
          config.palette.secondary?.main,
          config.palette.error?.main,
          config.palette.warning?.main,
          config.palette.info?.main,
          config.palette.success?.main,
        ];

        for (const color of colorFields) {
          if (color && !this.isValidColor(color)) {
            errors.push(`Invalid color format: ${color}`);
          }
        }

        // Check contrast ratios (basic check)
        if (
          config.palette.mode === 'light' &&
          config.palette.background?.default === '#ffffff' &&
          config.palette.text?.primary === '#ffffff'
        ) {
          errors.push('Insufficient contrast: white text on white background');
        }
      }

      if (config.spacing !== undefined) {
        if (config.spacing < 0 || config.spacing > 20) {
          warnings.push(`Unusual spacing value: ${config.spacing}`);
        }
      }

      if (config.shape?.borderRadius !== undefined) {
        if (
          config.shape.borderRadius < 0 ||
          config.shape.borderRadius > 50
        ) {
          warnings.push(
            `Unusual border radius: ${config.shape.borderRadius}`
          );
        }
      }

      if (config.typography?.fontSize !== undefined) {
        if (config.typography.fontSize < 8 || config.typography.fontSize > 24) {
          warnings.push(`Unusual font size: ${config.typography.fontSize}`);
        }
      }
    } catch (error: any) {
      errors.push(error.message);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate color format (basic)
   */
  private isValidColor(color: string): boolean {
    // Hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }
    // RGB/RGBA
    if (/^rgba?\([\d\s,./]+\)$/.test(color)) {
      return true;
    }
    // Named colors (basic list)
    const namedColors = ['red', 'blue', 'green', 'white', 'black', 'gray'];
    if (namedColors.includes(color.toLowerCase())) {
      return true;
    }
    return false;
  }

  // =========================================================================
  // THEME UTILITIES
  // =========================================================================

  /**
   * Deep merge two theme configs
   */
  mergeThemeConfigs(base: ThemeConfig, override: ThemeConfig): ThemeConfig {
    return this.deepMerge(base, override) as ThemeConfig;
  }

  /**
   * Deep merge utility
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Generate theme diff
   */
  generateThemeDiff(oldConfig: ThemeConfig, newConfig: ThemeConfig): ThemeDiff {
    const diff: ThemeDiff = {};

    // Palette diff
    if (oldConfig.palette || newConfig.palette) {
      diff.palette = this.generateObjectDiff(
        oldConfig.palette || {},
        newConfig.palette || {}
      );
    }

    // Typography diff
    if (oldConfig.typography || newConfig.typography) {
      diff.typography = this.generateObjectDiff(
        oldConfig.typography || {},
        newConfig.typography || {}
      );
    }

    // Other properties
    const otherOld = { ...oldConfig };
    delete (otherOld as any).palette;
    delete (otherOld as any).typography;

    const otherNew = { ...newConfig };
    delete (otherNew as any).palette;
    delete (otherNew as any).typography;

    if (Object.keys(otherOld).length > 0 || Object.keys(otherNew).length > 0) {
      diff.other = this.generateObjectDiff(otherOld, otherNew);
    }

    return diff;
  }

  /**
   * Generate diff for an object
   */
  private generateObjectDiff(
    oldObj: any,
    newObj: any
  ): {
    added?: string[];
    removed?: string[];
    changed?: Record<string, { from: any; to: any }>;
  } {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: Record<string, { from: any; to: any }> = {};

    // Find added and changed
    for (const key in newObj) {
      if (!(key in oldObj)) {
        added.push(key);
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changed[key] = { from: oldObj[key], to: newObj[key] };
      }
    }

    // Find removed
    for (const key in oldObj) {
      if (!(key in newObj)) {
        removed.push(key);
      }
    }

    return {
      ...(added.length > 0 && { added }),
      ...(removed.length > 0 && { removed }),
      ...(Object.keys(changed).length > 0 && { changed }),
    };
  }
}
