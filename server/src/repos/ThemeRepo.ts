import { Pool } from 'pg';
import logger from '../config/logger.js';

const themeLogger = logger.child({ name: 'ThemeRepo' });

export interface ThemeVariantTokens {
  primary: string;
  primaryContrast: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
  fontBody: string;
  fontHeading: string;
  fontMono: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusPill: string;
}

export interface TenantTheme {
  tenantId: string;
  name: string;
  light: ThemeVariantTokens;
  dark: ThemeVariantTokens;
  updatedAt: Date;
  createdAt?: Date;
}

interface ThemeRow {
  tenant_id: string;
  name: string;
  light: ThemeVariantTokens;
  dark: ThemeVariantTokens;
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_LIGHT: ThemeVariantTokens = {
  primary: '#1459FF',
  primaryContrast: '#FFFFFF',
  secondary: '#6366F1',
  accent: '#C026D3',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#E2E8F0',
  border: '#CBD5F5',
  text: '#0F172A',
  textMuted: '#475569',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  focus: '#2563EB',
  fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontHeading: "'Work Sans', 'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
  shadowSm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  shadowMd: '0 6px 18px rgba(15, 23, 42, 0.12)',
  shadowLg: '0 18px 48px rgba(15, 23, 42, 0.16)',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  radiusPill: '999px',
};

const DEFAULT_DARK: ThemeVariantTokens = {
  primary: '#7C9DFF',
  primaryContrast: '#0B1220',
  secondary: '#A5B4FC',
  accent: '#F472B6',
  background: '#0B1220',
  surface: '#111827',
  surfaceMuted: '#1F2937',
  border: '#27324A',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  focus: '#60A5FA',
  fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontHeading: "'Work Sans', 'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
  shadowSm: '0 1px 2px rgba(8, 47, 73, 0.6)',
  shadowMd: '0 6px 18px rgba(8, 47, 73, 0.55)',
  shadowLg: '0 18px 48px rgba(8, 47, 73, 0.5)',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  radiusPill: '999px',
};

const DEFAULT_THEME: Omit<TenantTheme, 'tenantId'> = {
  name: 'Summit Default',
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,
  updatedAt: new Date(0),
  createdAt: new Date(0),
};

export class ThemeRepo {
  constructor(private readonly pg: Pool) {}

  private mergeWithDefaults(theme: TenantTheme): TenantTheme {
    return {
      ...theme,
      light: { ...DEFAULT_LIGHT, ...theme.light },
      dark: { ...DEFAULT_DARK, ...theme.dark },
    };
  }

  private mapRow(row: ThemeRow): TenantTheme {
    return this.mergeWithDefaults({
      tenantId: row.tenant_id,
      name: row.name,
      light: row.light || DEFAULT_LIGHT,
      dark: row.dark || DEFAULT_DARK,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async getTheme(tenantId: string): Promise<TenantTheme> {
    try {
      const { rows } = await this.pg.query<ThemeRow>(
        `SELECT tenant_id, name, light, dark, created_at, updated_at
         FROM tenant_themes
         WHERE tenant_id = $1`,
        [tenantId],
      );

      if (rows.length === 0) {
        themeLogger.debug({ tenantId }, 'No tenant theme found, using defaults');
        return this.mergeWithDefaults({
          tenantId,
          ...DEFAULT_THEME,
        });
      }

      return this.mapRow(rows[0]);
    } catch (error) {
      themeLogger.warn({ tenantId, error }, 'Failed to load tenant theme, falling back to defaults');
      return this.mergeWithDefaults({
        tenantId,
        ...DEFAULT_THEME,
      });
    }
  }

  async upsertTheme(input: TenantTheme): Promise<TenantTheme> {
    try {
      const { rows } = await this.pg.query<ThemeRow>(
        `INSERT INTO tenant_themes (tenant_id, name, light, dark)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           light = EXCLUDED.light,
           dark = EXCLUDED.dark,
           updated_at = now()
         RETURNING tenant_id, name, light, dark, created_at, updated_at`,
        [input.tenantId, input.name, JSON.stringify(input.light), JSON.stringify(input.dark)],
      );

      return this.mapRow(rows[0]);
    } catch (error) {
      themeLogger.error({ tenantId: input.tenantId, error }, 'Failed to upsert tenant theme');
      throw error;
    }
  }
}

export const defaultTheme = (tenantId = 'default'): TenantTheme => ({
  tenantId,
  ...DEFAULT_THEME,
});
