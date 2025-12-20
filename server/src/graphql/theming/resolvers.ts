/**
 * GraphQL Resolvers for UI Theming System
 */

import type { Pool } from 'pg';
import type { PubSub } from 'graphql-subscriptions';
import { ThemeService } from '../../services/theming/theme-service.js';
import type {
  CreateThemeInput,
  UpdateThemeInput,
  UpdateUserThemePreferenceInput,
  ThemeResolutionContext,
} from '../../services/theming/theme-types.js';

interface Context {
  db: Pool;
  pubsub: PubSub;
  user: {
    id: string;
    tenantId: string;
    roles: string[];
    role?: string;
  };
}

export const themingResolvers = {
  Query: {
    /**
     * Get theme by ID
     */
    theme: async (_parent: any, args: { id: string }, context: Context) => {
      const service = new ThemeService(context.db);
      const theme = await service.getThemeById(args.id);

      if (!theme) {
        throw new Error(`Theme not found: ${args.id}`);
      }

      return theme;
    },

    /**
     * Get theme by name
     */
    themeByName: async (
      _parent: any,
      args: { name: string; tenantId?: string },
      context: Context
    ) => {
      const service = new ThemeService(context.db);
      const theme = await service.getThemeByName(
        args.name,
        args.tenantId || context.user.tenantId
      );

      if (!theme) {
        throw new Error(`Theme not found: ${args.name}`);
      }

      return theme;
    },

    /**
     * List themes
     */
    themes: async (
      _parent: any,
      args: {
        filter?: {
          role?: string;
          tenantId?: string;
          isActive?: boolean;
        };
      },
      context: Context
    ) => {
      const service = new ThemeService(context.db);
      return service.listThemes(args.filter);
    },

    /**
     * Get effective theme for current user
     */
    myEffectiveTheme: async (
      _parent: any,
      args: { systemDarkMode?: boolean },
      context: Context
    ) => {
      const service = new ThemeService(context.db);

      const resolutionContext: ThemeResolutionContext = {
        userId: context.user.id,
        tenantId: context.user.tenantId,
        userRole: context.user.role,
        systemDarkMode: args.systemDarkMode,
      };

      return service.getEffectiveTheme(resolutionContext);
    },

    /**
     * Get user theme preference
     */
    myThemePreference: async (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      const service = new ThemeService(context.db);
      return service.getUserThemePreference(
        context.user.id,
        context.user.tenantId
      );
    },

    /**
     * Validate theme configuration
     */
    validateThemeConfig: async (
      _parent: any,
      args: { config: any },
      context: Context
    ) => {
      const service = new ThemeService(context.db);
      return service.validateThemeConfig(args.config);
    },

    /**
     * List theme components
     */
    themeComponents: async (
      _parent: any,
      args: { category?: string },
      context: Context
    ) => {
      let query = `SELECT * FROM theme_components WHERE is_active = true`;
      const params: any[] = [];

      if (args.category) {
        query += ` AND category = $1`;
        params.push(args.category);
      }

      query += ` ORDER BY display_name`;

      const result = await context.db.query(query, params);
      return result.rows;
    },

    /**
     * List theme presets
     */
    themePresets: async (
      _parent: any,
      args: { featured?: boolean },
      context: Context
    ) => {
      let query = `SELECT * FROM theme_presets WHERE is_public = true`;
      const params: any[] = [];

      if (args.featured !== undefined) {
        query += ` AND is_featured = $1`;
        params.push(args.featured);
      }

      query += ` ORDER BY display_name`;

      const result = await context.db.query(query, params);
      return result.rows;
    },
  },

  Mutation: {
    /**
     * Create theme (admin only)
     */
    createTheme: async (
      _parent: any,
      args: { input: CreateThemeInput },
      context: Context
    ) => {
      // Check admin permission (enforced by @requireRole directive)
      const service = new ThemeService(context.db);

      const theme = await service.createTheme(args.input, context.user.id);

      // Publish theme update event
      context.pubsub.publish('THEME_UPDATED', {
        themeUpdated: await service.getEffectiveTheme({
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.role,
        }),
        tenantId: context.user.tenantId,
      });

      return theme;
    },

    /**
     * Update theme (admin only)
     */
    updateTheme: async (
      _parent: any,
      args: { id: string; input: UpdateThemeInput },
      context: Context
    ) => {
      const service = new ThemeService(context.db);

      const theme = await service.updateTheme(
        args.id,
        args.input,
        context.user.id
      );

      // Publish theme update event
      context.pubsub.publish('THEME_UPDATED', {
        themeUpdated: await service.getEffectiveTheme({
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.role,
        }),
        tenantId: context.user.tenantId,
      });

      return theme;
    },

    /**
     * Delete theme (admin only)
     */
    deleteTheme: async (
      _parent: any,
      args: { id: string },
      context: Context
    ) => {
      const service = new ThemeService(context.db);

      const success = await service.deleteTheme(args.id, context.user.id);

      if (!success) {
        throw new Error(`Failed to delete theme: ${args.id}`);
      }

      // Publish theme update event
      context.pubsub.publish('THEME_UPDATED', {
        themeUpdated: await service.getEffectiveTheme({
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.role,
        }),
        tenantId: context.user.tenantId,
      });

      return success;
    },

    /**
     * Update user theme preference
     */
    updateMyThemePreference: async (
      _parent: any,
      args: { input: UpdateUserThemePreferenceInput },
      context: Context
    ) => {
      const service = new ThemeService(context.db);

      const preference = await service.updateUserThemePreference(
        context.user.id,
        context.user.tenantId,
        args.input
      );

      // Publish theme update event for this user
      context.pubsub.publish('THEME_UPDATED', {
        themeUpdated: await service.getEffectiveTheme({
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.role,
        }),
        userId: context.user.id,
      });

      return preference;
    },

    /**
     * Reset user theme preference
     */
    resetMyThemePreference: async (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      const service = new ThemeService(context.db);

      // Reset to defaults (auto-switch enabled, no custom overrides)
      const preference = await service.updateUserThemePreference(
        context.user.id,
        context.user.tenantId,
        {
          theme_id: undefined,
          custom_overrides: undefined,
          auto_switch_by_role: true,
          dark_mode_preference: 'system',
        }
      );

      // Publish theme update event
      context.pubsub.publish('THEME_UPDATED', {
        themeUpdated: await service.getEffectiveTheme({
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.role,
        }),
        userId: context.user.id,
      });

      return preference;
    },
  },

  Subscription: {
    /**
     * Subscribe to theme updates
     */
    themeUpdated: {
      subscribe: async (_parent: any, _args: any, context: Context) => {
        return context.pubsub.asyncIterator(['THEME_UPDATED']);
      },
      resolve: (payload: any, _args: any, context: Context) => {
        // Filter events for current user or tenant
        if (
          payload.userId === context.user.id ||
          payload.tenantId === context.user.tenantId
        ) {
          return payload.themeUpdated;
        }
        return null;
      },
    },
  },

  // Field resolvers
  UITheme: {
    // Convert snake_case to camelCase for GraphQL
    displayName: (parent: any) => parent.display_name,
    tenantId: (parent: any) => parent.tenant_id,
    themeConfig: (parent: any) => parent.theme_config,
    isActive: (parent: any) => parent.is_active,
    isDefault: (parent: any) => parent.is_default,
    createdBy: (parent: any) => parent.created_by,
    createdAt: (parent: any) => parent.created_at,
    updatedBy: (parent: any) => parent.updated_by,
    updatedAt: (parent: any) => parent.updated_at,
  },

  UserThemePreference: {
    userId: (parent: any) => parent.user_id,
    tenantId: (parent: any) => parent.tenant_id,
    theme: async (parent: any, _args: any, context: Context) => {
      if (!parent.theme_id) {
        return null;
      }
      const service = new ThemeService(context.db);
      return service.getThemeById(parent.theme_id);
    },
    customOverrides: (parent: any) => parent.custom_overrides,
    autoSwitchByRole: (parent: any) => parent.auto_switch_by_role,
    darkModePreference: (parent: any) =>
      parent.dark_mode_preference?.toUpperCase(),
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },

  EffectiveTheme: {
    source: (parent: any) => parent.source.toUpperCase().replace(/_/g, '_'),
    themeId: (parent: any) => parent.theme_id,
    themeName: (parent: any) => parent.theme_name,
  },

  ThemeComponent: {
    componentName: (parent: any) => parent.component_name,
    displayName: (parent: any) => parent.display_name,
    componentConfig: (parent: any) => parent.component_config,
    isActive: (parent: any) => parent.is_active,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },

  ThemePreset: {
    presetName: (parent: any) => parent.preset_name,
    displayName: (parent: any) => parent.display_name,
    baseTheme: async (parent: any, _args: any, context: Context) => {
      if (!parent.base_theme_id) {
        return null;
      }
      const service = new ThemeService(context.db);
      return service.getThemeById(parent.base_theme_id);
    },
    presetOverrides: (parent: any) => parent.preset_overrides,
    isPublic: (parent: any) => parent.is_public,
    isFeatured: (parent: any) => parent.is_featured,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },
};
