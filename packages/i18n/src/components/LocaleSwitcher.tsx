import React, { useState } from 'react';
import { useI18n } from '../hooks/useI18n.js';
import type { Locale, LocaleConfig } from '../types/index.js';
import {
  getAvailableLocales,
  getLocalesByRegion,
} from '../config/locales.js';

export interface LocaleSwitcherProps {
  /** Display mode */
  mode?: 'dropdown' | 'list' | 'grid';
  /** Show language names in native language */
  showNativeNames?: boolean;
  /** Show flags */
  showFlags?: boolean;
  /** Group by region */
  groupByRegion?: boolean;
  /** Custom className */
  className?: string;
  /** Custom onChange handler */
  onChange?: (locale: Locale) => void;
}

/**
 * Locale switcher component with dropdown/list/grid modes
 */
export function LocaleSwitcher({
  mode = 'dropdown',
  showNativeNames = true,
  showFlags = true,
  groupByRegion = false,
  className = '',
  onChange,
}: LocaleSwitcherProps) {
  const { locale, setLocale, availableLocales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    onChange?.(newLocale);
    setIsOpen(false);
  };

  const currentLocale = availableLocales.find((l) => l.code === locale);

  const renderLocaleOption = (localeConfig: LocaleConfig) => (
    <div
      key={localeConfig.code}
      className={`locale-option ${locale === localeConfig.code ? 'active' : ''}`}
      onClick={() => handleLocaleChange(localeConfig.code)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleLocaleChange(localeConfig.code);
        }
      }}
    >
      {showFlags && <span className="locale-flag">{localeConfig.flag}</span>}
      <span className="locale-name">
        {showNativeNames ? localeConfig.name : localeConfig.englishName}
      </span>
      {locale === localeConfig.code && <span className="check-mark">✓</span>}
    </div>
  );

  if (mode === 'dropdown') {
    return (
      <div className={`locale-switcher locale-switcher-dropdown ${className}`}>
        <button
          className="locale-switcher-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {showFlags && currentLocale && (
            <span className="locale-flag">{currentLocale.flag}</span>
          )}
          <span className="locale-name">
            {currentLocale
              ? showNativeNames
                ? currentLocale.name
                : currentLocale.englishName
              : 'Select Language'}
          </span>
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <>
            <div
              className="locale-switcher-overlay"
              onClick={() => setIsOpen(false)}
            />
            <div className="locale-switcher-dropdown-menu">
              {groupByRegion ? (
                Object.entries(getLocalesByRegion()).map(([region, locales]) => (
                  <div key={region} className="locale-region-group">
                    <div className="locale-region-header">{region}</div>
                    {locales.map(renderLocaleOption)}
                  </div>
                ))
              ) : (
                availableLocales.map(renderLocaleOption)
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className={`locale-switcher locale-switcher-list ${className}`}>
        {groupByRegion ? (
          Object.entries(getLocalesByRegion()).map(([region, locales]) => (
            <div key={region} className="locale-region-group">
              <h3 className="locale-region-header">{region}</h3>
              <div className="locale-list">
                {locales.map(renderLocaleOption)}
              </div>
            </div>
          ))
        ) : (
          <div className="locale-list">
            {availableLocales.map(renderLocaleOption)}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className={`locale-switcher locale-switcher-grid ${className}`}>
        {groupByRegion ? (
          Object.entries(getLocalesByRegion()).map(([region, locales]) => (
            <div key={region} className="locale-region-group">
              <h3 className="locale-region-header">{region}</h3>
              <div className="locale-grid">
                {locales.map(renderLocaleOption)}
              </div>
            </div>
          ))
        ) : (
          <div className="locale-grid">
            {availableLocales.map(renderLocaleOption)}
          </div>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Default styles (can be overridden)
 */
export const localeSwitcherStyles = `
.locale-switcher {
  position: relative;
  font-family: system-ui, -apple-system, sans-serif;
}

.locale-switcher-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.locale-switcher-button:hover {
  border-color: #999;
  background: #f9f9f9;
}

.locale-switcher-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.locale-switcher-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 400px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.locale-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.locale-option:hover {
  background: #f0f0f0;
}

.locale-option.active {
  background: #e6f7ff;
  color: #0066cc;
}

.locale-flag {
  font-size: 20px;
  flex-shrink: 0;
}

.locale-name {
  flex: 1;
}

.check-mark {
  color: #0066cc;
  font-weight: bold;
}

.dropdown-arrow {
  font-size: 10px;
  color: #666;
}

.locale-region-group {
  border-bottom: 1px solid #eee;
  padding: 8px 0;
}

.locale-region-group:last-child {
  border-bottom: none;
}

.locale-region-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  background: #f9f9f9;
  margin: 0;
}

.locale-list {
  display: flex;
  flex-direction: column;
}

.locale-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  padding: 8px;
}

.locale-grid .locale-option {
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  flex-direction: column;
}

.locale-grid .locale-option:hover {
  border-color: #999;
}

.locale-grid .locale-option.active {
  border-color: #0066cc;
}
`;
