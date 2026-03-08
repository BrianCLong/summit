"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenVar = exports.designTokenEntries = exports.tokenVariables = exports.tokens = void 0;
exports.tokens = {
    spacing: {
        '3xs': 2,
        '2xs': 4,
        xs: 8,
        sm: 12,
        md: 16,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 40,
    },
    radii: {
        none: 0,
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        pill: 9999,
    },
    typography: {
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        sizes: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 24,
        },
        lineHeights: {
            tight: 1.25,
            standard: 1.5,
            relaxed: 1.7,
        },
        weights: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },
    zIndices: {
        base: 1,
        card: 10,
        dropdown: 100,
        navigation: 200,
        overlay: 400,
        modal: 500,
        toast: 650,
        tooltip: 700,
    },
    shadows: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.06)',
        sm: '0 2px 6px rgba(0, 0, 0, 0.08)',
        md: '0 6px 16px rgba(0, 0, 0, 0.12)',
        lg: '0 12px 30px rgba(0, 0, 0, 0.16)',
    },
};
const formatPx = (value) => typeof value === 'number' ? `${value}px` : value;
const buildCssVariables = () => {
    const vars = {
        'ds-font-family-sans': exports.tokens.typography.fontFamily,
    };
    Object.entries(exports.tokens.spacing).forEach(([key, value]) => {
        vars[`ds-space-${key}`] = formatPx(value);
    });
    Object.entries(exports.tokens.radii).forEach(([key, value]) => {
        vars[`ds-radius-${key}`] = formatPx(value);
    });
    Object.entries(exports.tokens.typography.sizes).forEach(([key, value]) => {
        vars[`ds-font-size-${key}`] = formatPx(value);
    });
    Object.entries(exports.tokens.typography.lineHeights).forEach(([key, value]) => {
        vars[`ds-line-height-${key}`] = `${value}`;
    });
    Object.entries(exports.tokens.typography.weights).forEach(([key, value]) => {
        vars[`ds-font-weight-${key}`] = `${value}`;
    });
    Object.entries(exports.tokens.zIndices).forEach(([key, value]) => {
        vars[`ds-z-${key}`] = `${value}`;
    });
    Object.entries(exports.tokens.shadows).forEach(([key, value]) => {
        vars[`ds-shadow-${key}`] = `${value}`;
    });
    return vars;
};
exports.tokenVariables = buildCssVariables();
exports.designTokenEntries = Object.entries(exports.tokenVariables);
const tokenVar = (name) => `var(--${name})`;
exports.tokenVar = tokenVar;
