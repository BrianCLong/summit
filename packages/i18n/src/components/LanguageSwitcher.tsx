import React, { useState } from 'react';
import { useI18n } from '../hooks/useI18n';
import type { Locale } from '../types';
import { getLocalesByRegion } from '../config/locales';

export interface LanguageSwitcherProps {
  /** Display variant */
  variant?: 'dropdown' | 'menu' | 'flags' | 'minimal';
  /** Show flag icons */
  showFlags?: boolean;
  /** Show language names */
  showNames?: boolean;
  /** Group by region */
  groupByRegion?: boolean;
  /** Custom className */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

/**
 * Language Switcher Component
 *
 * Provides a UI for switching between available languages.
 * Supports RTL languages and multiple display variants.
 *
 * @example
 * ```tsx
 * <LanguageSwitcher variant="dropdown" showFlags showNames groupByRegion />
 * ```
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  showFlags = true,
  showNames = true,
  groupByRegion = false,
  className = '',
  style = {},
}: LanguageSwitcherProps) {
  const { locale, setLocale, availableLocales, direction } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocaleConfig = availableLocales.find((l) => l.code === locale);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  // Minimal variant - just current flag
  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`i18n-switcher-minimal ${className}`}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '1.5rem',
          padding: '0.25rem',
          ...style,
        }}
        title={currentLocaleConfig?.englishName}
      >
        {currentLocaleConfig?.flag}
      </button>
    );
  }

  // Flags variant - horizontal flag list
  if (variant === 'flags') {
    return (
      <div
        className={`i18n-switcher-flags ${className}`}
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          ...style,
        }}
      >
        {availableLocales.map((localeConfig) => (
          <button
            key={localeConfig.code}
            onClick={() => handleLocaleChange(localeConfig.code)}
            className={`i18n-flag-button ${
              locale === localeConfig.code ? 'active' : ''
            }`}
            style={{
              border: locale === localeConfig.code ? '2px solid #0066cc' : '1px solid #ccc',
              background: locale === localeConfig.code ? '#f0f8ff' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0.25rem 0.5rem',
            }}
            title={localeConfig.englishName}
          >
            {localeConfig.flag}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant
  const localeGroups = groupByRegion ? getLocalesByRegion() : { All: availableLocales };

  return (
    <div
      className={`i18n-switcher-dropdown ${className}`}
      style={{ position: 'relative', ...style }}
      dir={direction}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="i18n-switcher-button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        {showFlags && <span style={{ fontSize: '1.25rem' }}>{currentLocaleConfig?.flag}</span>}
        {showNames && <span>{currentLocaleConfig?.name}</span>}
        <span style={{ marginLeft: 'auto' }}>▼</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* Dropdown menu */}
          <div
            className="i18n-dropdown-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: direction === 'rtl' ? 'auto' : 0,
              right: direction === 'rtl' ? 0 : 'auto',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: '400px',
              overflowY: 'auto',
              minWidth: '250px',
              zIndex: 1000,
            }}
          >
            {Object.entries(localeGroups).map(([region, locales]) => (
              <div key={region} className="i18n-locale-group">
                {groupByRegion && (
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f5f5f5',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: '#666',
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    {region}
                  </div>
                )}

                {locales.map((localeConfig) => (
                  <button
                    key={localeConfig.code}
                    onClick={() => handleLocaleChange(localeConfig.code)}
                    className={`i18n-locale-option ${
                      locale === localeConfig.code ? 'active' : ''
                    }`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background:
                        locale === localeConfig.code ? '#f0f8ff' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (locale !== localeConfig.code) {
                        e.currentTarget.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (locale !== localeConfig.code) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {showFlags && (
                      <span style={{ fontSize: '1.5rem' }}>{localeConfig.flag}</span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span
                        style={{
                          fontWeight: locale === localeConfig.code ? 'bold' : 'normal',
                        }}
                      >
                        {localeConfig.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>
                        {localeConfig.englishName}
                      </span>
                    </div>
                    {locale === localeConfig.code && (
                      <span style={{ marginLeft: 'auto' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Simple flag-only language selector
 */
export function FlagSelector({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <LanguageSwitcher
      variant="minimal"
      showFlags
      showNames={false}
      className={className}
      style={style}
    />
  );
}

/**
 * Compact dropdown language selector
 */
export function CompactLanguageSelector({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <LanguageSwitcher
      variant="dropdown"
      showFlags
      showNames
      groupByRegion={false}
      className={className}
      style={style}
    />
  );
}

/**
 * Full language selector with regional grouping
 */
export function FullLanguageSelector({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <LanguageSwitcher
      variant="dropdown"
      showFlags
      showNames
      groupByRegion
      className={className}
      style={style}
    />
  );
}
