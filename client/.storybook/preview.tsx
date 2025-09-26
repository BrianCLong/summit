import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import TenantThemeProvider, { useTenantTheme } from '../src/theme/ThemeProvider.jsx';
import '../src/styles/globals.css';

const storybookTheme = {
  tenantId: 'storybook',
  name: 'Storybook Showcase',
  light: {
    primary: '#1D4ED8',
    primaryContrast: '#FFFFFF',
    secondary: '#7C3AED',
    accent: '#F97316',
    background: '#F5F7FF',
    surface: '#FFFFFF',
    surfaceMuted: '#E0E7FF',
    border: '#CBD5F5',
    text: '#111827',
    textMuted: '#4B5563',
    success: '#0EA5E9',
    warning: '#D97706',
    danger: '#DC2626',
    focus: '#4338CA',
    fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontHeading: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
    shadowSm: '0 1px 3px rgba(29, 78, 216, 0.12)',
    shadowMd: '0 12px 24px rgba(29, 78, 216, 0.12)',
    shadowLg: '0 18px 40px rgba(79, 70, 229, 0.18)',
    radiusSm: '6px',
    radiusMd: '12px',
    radiusLg: '20px',
    radiusPill: '999px',
  },
  dark: {
    primary: '#93C5FD',
    primaryContrast: '#0B1220',
    secondary: '#C4B5FD',
    accent: '#FDBA74',
    background: '#0B1220',
    surface: '#111827',
    surfaceMuted: '#1F2937',
    border: '#1E3A8A',
    text: '#E5E7EB',
    textMuted: '#9CA3AF',
    success: '#38BDF8',
    warning: '#FBBF24',
    danger: '#F87171',
    focus: '#60A5FA',
    fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontHeading: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
    shadowSm: '0 1px 3px rgba(15, 23, 42, 0.45)',
    shadowMd: '0 12px 24px rgba(15, 23, 42, 0.45)',
    shadowLg: '0 18px 40px rgba(15, 23, 42, 0.5)',
    radiusSm: '6px',
    radiusMd: '12px',
    radiusLg: '20px',
    radiusPill: '999px',
  },
};

const ThemeModeBridge: React.FC<{ mode: string; children: React.ReactNode }> = ({ mode, children }) => {
  const { setMode } = useTenantTheme();

  useEffect(() => {
    if (mode) {
      setMode(mode);
    }
  }, [mode, setMode]);

  return <div style={{ minHeight: '100vh', padding: '1.5rem' }}>{children}</div>;
};

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    actions: { argTypesRegex: '^on[A-Z].*' },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#F5F7FF' },
        { name: 'contrast', value: '#0B1220' },
      ],
    },
  },
  globalTypes: {
    themeMode: {
      name: 'Theme Mode',
      description: 'Switch between light, dark, and system modes',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'system', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const mode = context.globals.themeMode as string;
      return (
        <TenantThemeProvider disableRemote initialTheme={storybookTheme}>
          <ThemeModeBridge mode={mode}>
            <Story />
          </ThemeModeBridge>
        </TenantThemeProvider>
      );
    },
  ],
};

export default preview;
