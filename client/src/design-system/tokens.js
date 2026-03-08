"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedSpacing = exports.allowedColors = exports.darkTokens = exports.lightTokens = void 0;
exports.lightTokens = {
    version: '1.0.0',
    palette: {
        mode: 'light',
        primary: {
            main: '#3B82F6',
            contrastText: '#FFFFFF',
            emphasis: '#1D4ED8',
            muted: '#93C5FD',
            border: '#1D4ED8',
        },
        secondary: {
            main: '#7C3AED',
            contrastText: '#FFFFFF',
            emphasis: '#5B21B6',
            muted: '#C4B5FD',
            border: '#5B21B6',
        },
        success: {
            main: '#10B981',
            contrastText: '#053321',
            emphasis: '#059669',
            muted: '#6EE7B7',
            border: '#047857',
        },
        warning: {
            main: '#F59E0B',
            contrastText: '#3F2C00',
            emphasis: '#D97706',
            muted: '#FCD34D',
            border: '#B45309',
        },
        error: {
            main: '#EF4444',
            contrastText: '#3E0000',
            emphasis: '#DC2626',
            muted: '#FCA5A5',
            border: '#991B1B',
        },
        background: {
            surface: '#FFFFFF',
            subtle: '#F7F9FC',
            elevated: '#F1F5F9',
        },
        text: {
            primary: '#0F172A',
            secondary: '#334155',
            muted: '#64748B',
        },
        border: {
            light: '#E2E8F0',
            default: '#CBD5E1',
            strong: '#94A3B8',
        },
        states: {
            hover: '#E0EAFF',
            active: '#C7D2FE',
            focus: '#1D4ED8',
            disabled: '#CBD5E1',
            outline: '#1D4ED8',
        },
    },
    typography: {
        fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
        headings: {
            h1: { fontSize: '32px', fontWeight: 700, lineHeight: 1.1 },
            h2: { fontSize: '28px', fontWeight: 700, lineHeight: 1.2 },
            h3: { fontSize: '24px', fontWeight: 600, lineHeight: 1.3 },
            h4: { fontSize: '20px', fontWeight: 600, lineHeight: 1.4 },
            h5: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4 },
            h6: { fontSize: '16px', fontWeight: 600, lineHeight: 1.5 },
        },
        body: {
            regular: { fontSize: '16px', lineHeight: 1.5 },
            small: { fontSize: '14px', lineHeight: 1.5 },
            caption: { fontSize: '12px', lineHeight: 1.4 },
        },
    },
    spacing: {
        none: 0,
        xxs: 2,
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
    },
    radius: {
        sm: 4,
        md: 8,
        lg: 12,
        pill: 999,
    },
    motion: {
        fast: '120ms ease-out',
        normal: '180ms ease',
        slow: '260ms ease-in-out',
    },
    shadows: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
        md: '0 2px 8px rgba(15, 23, 42, 0.12)',
        lg: '0 8px 24px rgba(15, 23, 42, 0.12)',
    },
};
exports.darkTokens = {
    ...exports.lightTokens,
    palette: {
        ...exports.lightTokens.palette,
        mode: 'dark',
        primary: {
            main: '#93C5FD',
            contrastText: '#0B1220',
            emphasis: '#60A5FA',
            muted: '#1E293B',
            border: '#93C5FD',
        },
        background: {
            surface: '#0B1220',
            subtle: '#111827',
            elevated: '#1F2937',
        },
        text: {
            primary: '#E2E8F0',
            secondary: '#CBD5E1',
            muted: '#94A3B8',
        },
        border: {
            light: '#1F2937',
            default: '#334155',
            strong: '#475569',
        },
        states: {
            hover: '#1F2937',
            active: '#111827',
            focus: '#93C5FD',
            disabled: '#1F2937',
            outline: '#93C5FD',
        },
    },
};
exports.allowedColors = new Set([
    exports.lightTokens.palette.primary.main,
    exports.lightTokens.palette.primary.emphasis,
    exports.lightTokens.palette.secondary.main,
    exports.lightTokens.palette.success.main,
    exports.lightTokens.palette.warning.main,
    exports.lightTokens.palette.error.main,
    exports.lightTokens.palette.text.primary,
    exports.lightTokens.palette.text.secondary,
    exports.lightTokens.palette.text.muted,
    exports.darkTokens.palette.primary.main,
    exports.darkTokens.palette.primary.emphasis,
    exports.darkTokens.palette.secondary.main,
    exports.darkTokens.palette.success.main,
    exports.darkTokens.palette.warning.main,
    exports.darkTokens.palette.error.main,
    exports.darkTokens.palette.text.primary,
    exports.darkTokens.palette.text.secondary,
    exports.darkTokens.palette.text.muted,
]);
exports.allowedSpacing = new Set([
    exports.lightTokens.spacing.none,
    exports.lightTokens.spacing.xxs,
    exports.lightTokens.spacing.xs,
    exports.lightTokens.spacing.sm,
    exports.lightTokens.spacing.md,
    exports.lightTokens.spacing.lg,
    exports.lightTokens.spacing.xl,
    exports.lightTokens.spacing.xxl,
]);
