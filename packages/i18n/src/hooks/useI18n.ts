import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Locale, I18nHook, TranslationParams, TranslationContext } from '../types';
import { getLocaleConfig, isRTLLocale, getAvailableLocales } from '../config/locales';

/**
 * Custom i18n hook with enhanced functionality
 *
 * Provides translation function, locale management, formatting utilities,
 * and RTL support for the Summit/IntelGraph platform.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale, formatDate, isRTL } = useI18n();
 *
 *   return (
 *     <div dir={isRTL ? 'rtl' : 'ltr'}>
 *       <h1>{t('common.welcome')}</h1>
 *       <p>{formatDate(new Date())}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useI18n(): I18nHook {
  const { t: i18nT, i18n, ready } = useTranslation();

  const locale = i18n.language as Locale;
  const localeConfig = useMemo(() => getLocaleConfig(locale), [locale]);
  const isRTL = useMemo(() => isRTLLocale(locale), [locale]);

  /**
   * Set the current locale
   */
  const setLocale = useCallback((newLocale: Locale) => {
    i18n.changeLanguage(newLocale);

    // Update HTML attributes for accessibility and RTL support
    document.documentElement.lang = newLocale;
    document.documentElement.dir = isRTLLocale(newLocale) ? 'rtl' : 'ltr';

    // Store preference
    localStorage.setItem('i18nextLng', newLocale);
  }, [i18n]);

  /**
   * Translation function with enhanced features
   */
  const t = useCallback((
    key: string,
    params?: TranslationParams,
    context?: TranslationContext
  ): string => {
    const options: any = {};

    if (params) {
      Object.assign(options, params);
    }

    if (context?.count !== undefined) {
      options.count = context.count;
    }

    if (context?.context) {
      options.context = context.context;
    }

    if (context?.defaultValue) {
      options.defaultValue = context.defaultValue;
    }

    return i18nT(key, options);
  }, [i18nT]);

  /**
   * Format date according to locale
   */
  const formatDate = useCallback((
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };

    return d.toLocaleDateString(locale, { ...defaultOptions, ...options });
  }, [locale]);

  /**
   * Format number according to locale
   */
  const formatNumber = useCallback((
    num: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    return num.toLocaleString(locale, {
      ...localeConfig.numberFormat,
      ...options,
    });
  }, [locale, localeConfig]);

  /**
   * Format currency according to locale
   */
  const formatCurrency = useCallback((
    amount: number,
    currency?: string
  ): string => {
    return amount.toLocaleString(locale, {
      style: 'currency',
      currency: currency || localeConfig.currency || 'USD',
    });
  }, [locale, localeConfig]);

  /**
   * Format relative time (e.g., "2 hours ago", "in 3 days")
   */
  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      if (Math.abs(diffYear) >= 1) {
        return rtf.format(diffYear, 'year');
      } else if (Math.abs(diffMonth) >= 1) {
        return rtf.format(diffMonth, 'month');
      } else if (Math.abs(diffWeek) >= 1) {
        return rtf.format(diffWeek, 'week');
      } else if (Math.abs(diffDay) >= 1) {
        return rtf.format(diffDay, 'day');
      } else if (Math.abs(diffHour) >= 1) {
        return rtf.format(diffHour, 'hour');
      } else if (Math.abs(diffMin) >= 1) {
        return rtf.format(diffMin, 'minute');
      } else {
        return rtf.format(diffSec, 'second');
      }
    } catch (error) {
      console.error('RelativeTimeFormat not supported', error);
      return formatDate(d);
    }
  }, [locale, formatDate]);

  /**
   * Get available locales
   */
  const availableLocales = useMemo(() => getAvailableLocales(), []);

  return {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    isRTL,
    direction: localeConfig.direction,
    availableLocales,
    isLoading: !ready,
    changeLanguage: setLocale, // Alias for consistency
  };
}
