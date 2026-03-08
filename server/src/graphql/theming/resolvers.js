"use strict";
/**
 * GraphQL Resolvers for UI Theming System
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.themingResolvers = void 0;
const theme_service_js_1 = require("../../services/theming/theme-service.js");
exports.themingResolvers = {
    Query: {
        /**
         * Get theme by ID
         */
        theme: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            const theme = await service.getThemeById(args.id);
            if (!theme) {
                throw new Error(`Theme not found: ${args.id}`);
            }
            return theme;
        },
        /**
         * Get theme by name
         */
        themeByName: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            const theme = await service.getThemeByName(args.name, args.tenantId || context.user.tenantId);
            if (!theme) {
                throw new Error(`Theme not found: ${args.name}`);
            }
            return theme;
        },
        /**
         * List themes
         */
        themes: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            return service.listThemes(args.filter);
        },
        /**
         * Get effective theme for current user
         */
        myEffectiveTheme: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            const resolutionContext = {
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
        myThemePreference: async (_parent, _args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            return service.getUserThemePreference(context.user.id, context.user.tenantId);
        },
        /**
         * Validate theme configuration
         */
        validateThemeConfig: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            return service.validateThemeConfig(args.config);
        },
        /**
         * List theme components
         */
        themeComponents: async (_parent, args, context) => {
            let query = `SELECT * FROM theme_components WHERE is_active = true`;
            const params = [];
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
        themePresets: async (_parent, args, context) => {
            let query = `SELECT * FROM theme_presets WHERE is_public = true`;
            const params = [];
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
        createTheme: async (_parent, args, context) => {
            // Check admin permission (enforced by @requireRole directive)
            const service = new theme_service_js_1.ThemeService(context.db);
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
        updateTheme: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            const theme = await service.updateTheme(args.id, args.input, context.user.id);
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
        deleteTheme: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
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
        updateMyThemePreference: async (_parent, args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            const preference = await service.updateUserThemePreference(context.user.id, context.user.tenantId, args.input);
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
        resetMyThemePreference: async (_parent, _args, context) => {
            const service = new theme_service_js_1.ThemeService(context.db);
            // Reset to defaults (auto-switch enabled, no custom overrides)
            const preference = await service.updateUserThemePreference(context.user.id, context.user.tenantId, {
                theme_id: undefined,
                custom_overrides: undefined,
                auto_switch_by_role: true,
                dark_mode_preference: 'system',
            });
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
            subscribe: async (_parent, _args, context) => {
                return context.pubsub.asyncIterator(['THEME_UPDATED']);
            },
            resolve: (payload, _args, context) => {
                // Filter events for current user or tenant
                if (payload.userId === context.user.id ||
                    payload.tenantId === context.user.tenantId) {
                    return payload.themeUpdated;
                }
                return null;
            },
        },
    },
    // Field resolvers
    UITheme: {
        // Convert snake_case to camelCase for GraphQL
        displayName: (parent) => parent.display_name,
        tenantId: (parent) => parent.tenant_id,
        themeConfig: (parent) => parent.theme_config,
        isActive: (parent) => parent.is_active,
        isDefault: (parent) => parent.is_default,
        createdBy: (parent) => parent.created_by,
        createdAt: (parent) => parent.created_at,
        updatedBy: (parent) => parent.updated_by,
        updatedAt: (parent) => parent.updated_at,
    },
    UserThemePreference: {
        userId: (parent) => parent.user_id,
        tenantId: (parent) => parent.tenant_id,
        theme: async (parent, _args, context) => {
            if (!parent.theme_id) {
                return null;
            }
            const service = new theme_service_js_1.ThemeService(context.db);
            return service.getThemeById(parent.theme_id);
        },
        customOverrides: (parent) => parent.custom_overrides,
        autoSwitchByRole: (parent) => parent.auto_switch_by_role,
        darkModePreference: (parent) => parent.dark_mode_preference?.toUpperCase(),
        createdAt: (parent) => parent.created_at,
        updatedAt: (parent) => parent.updated_at,
    },
    EffectiveTheme: {
        source: (parent) => parent.source.toUpperCase().replace(/_/g, '_'),
        themeId: (parent) => parent.theme_id,
        themeName: (parent) => parent.theme_name,
    },
    ThemeComponent: {
        componentName: (parent) => parent.component_name,
        displayName: (parent) => parent.display_name,
        componentConfig: (parent) => parent.component_config,
        isActive: (parent) => parent.is_active,
        createdAt: (parent) => parent.created_at,
        updatedAt: (parent) => parent.updated_at,
    },
    ThemePreset: {
        presetName: (parent) => parent.preset_name,
        displayName: (parent) => parent.display_name,
        baseTheme: async (parent, _args, context) => {
            if (!parent.base_theme_id) {
                return null;
            }
            const service = new theme_service_js_1.ThemeService(context.db);
            return service.getThemeById(parent.base_theme_id);
        },
        presetOverrides: (parent) => parent.preset_overrides,
        isPublic: (parent) => parent.is_public,
        isFeatured: (parent) => parent.is_featured,
        createdAt: (parent) => parent.created_at,
        updatedAt: (parent) => parent.updated_at,
    },
};
