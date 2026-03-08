"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadows = exports.typography = exports.spacing = exports.theme = exports.useAppTheme = exports.darkTheme = exports.lightTheme = void 0;
const react_native_paper_1 = require("react-native-paper");
const react_native_1 = require("react-native");
exports.lightTheme = {
    ...react_native_paper_1.MD3LightTheme,
    colors: {
        ...react_native_paper_1.MD3LightTheme.colors,
        primary: '#2563eb',
        secondary: '#7c3aed',
        tertiary: '#10b981',
        error: '#ef4444',
        background: '#ffffff',
        surface: '#f9fafb',
        surfaceVariant: '#e5e7eb',
        onPrimary: '#ffffff',
        onSecondary: '#ffffff',
        onBackground: '#111827',
        onSurface: '#111827',
        outline: '#d1d5db',
    },
};
exports.darkTheme = {
    ...react_native_paper_1.MD3DarkTheme,
    colors: {
        ...react_native_paper_1.MD3DarkTheme.colors,
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        tertiary: '#10b981',
        error: '#f87171',
        background: '#111827',
        surface: '#1f2937',
        surfaceVariant: '#374151',
        onPrimary: '#ffffff',
        onSecondary: '#ffffff',
        onBackground: '#f9fafb',
        onSurface: '#f9fafb',
        outline: '#4b5563',
    },
};
const useAppTheme = () => {
    const colorScheme = (0, react_native_1.useColorScheme)();
    return colorScheme === 'dark' ? exports.darkTheme : exports.lightTheme;
};
exports.useAppTheme = useAppTheme;
exports.theme = exports.lightTheme; // Default theme
exports.spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};
exports.typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 40,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    },
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    small: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
    },
};
exports.shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
};
