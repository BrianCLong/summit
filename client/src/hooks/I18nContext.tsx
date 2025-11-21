import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type { Locale } from './useI18n';

interface Messages {
  [key: string]: string | Messages;
}

// Cache for loaded messages
const messageCache: Record<string, Messages> = {};

// Locale configurations
const LOCALE_CONFIGS: Record<
  Locale,
  {
    flag: string;
    name: string;
    dateFormat: string;
    numberFormat: Intl.NumberFormatOptions;
  }
> = {
  'en-US': { flag: '🇺🇸', name: 'English (US)', dateFormat: 'MM/dd/yyyy', numberFormat: {} },
  'en-GB': { flag: '🇬🇧', name: 'English (UK)', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'fr-FR': { flag: '🇫🇷', name: 'Français', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'de-DE': { flag: '🇩🇪', name: 'Deutsch', dateFormat: 'dd.MM.yyyy', numberFormat: { style: 'decimal' } },
  'it-IT': { flag: '🇮🇹', name: 'Italiano', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'es-ES': { flag: '🇪🇸', name: 'Español', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'pt-PT': { flag: '🇵🇹', name: 'Português', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'nl-NL': { flag: '🇳🇱', name: 'Nederlands', dateFormat: 'dd-MM-yyyy', numberFormat: {} },
  'da-DK': { flag: '🇩🇰', name: 'Dansk', dateFormat: 'dd-MM-yyyy', numberFormat: {} },
  'no-NO': { flag: '🇳🇴', name: 'Norsk', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'sv-SE': { flag: '🇸🇪', name: 'Svenska', dateFormat: 'yyyy-MM-dd', numberFormat: {} },
  'fi-FI': { flag: '🇫🇮', name: 'Suomi', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'is-IS': { flag: '🇮🇸', name: 'Íslenska', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'pl-PL': { flag: '🇵🇱', name: 'Polski', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'cs-CZ': { flag: '🇨🇿', name: 'Čeština', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'sk-SK': { flag: '🇸🇰', name: 'Slovenčina', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'hu-HU': { flag: '🇭🇺', name: 'Magyar', dateFormat: 'yyyy.MM.dd', numberFormat: {} },
  'ro-RO': { flag: '🇷🇴', name: 'Română', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'bg-BG': { flag: '🇧🇬', name: 'Български', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'hr-HR': { flag: '🇭🇷', name: 'Hrvatski', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'sl-SI': { flag: '🇸🇮', name: 'Slovenščina', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'et-EE': { flag: '🇪🇪', name: 'Eesti', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'lv-LV': { flag: '🇱🇻', name: 'Latviešu', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'lt-LT': { flag: '🇱🇹', name: 'Lietuvių', dateFormat: 'yyyy-MM-dd', numberFormat: {} },
  'mt-MT': { flag: '🇲🇹', name: 'Malti', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'tr-TR': { flag: '🇹🇷', name: 'Türkçe', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'el-GR': { flag: '🇬🇷', name: 'Ελληνικά', dateFormat: 'dd/MM/yyyy', numberFormat: {} },
  'mk-MK': { flag: '🇲🇰', name: 'Македонски', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'al-AL': { flag: '🇦🇱', name: 'Shqip', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
  'me-ME': { flag: '🇲🇪', name: 'Crnogorski', dateFormat: 'dd.MM.yyyy', numberFormat: {} },
};

async function loadMessages(locale: Locale): Promise<Messages> {
  if (messageCache[locale]) {
    return messageCache[locale];
  }

  try {
    const messages = await import(`../locales/${locale}.json`);
    messageCache[locale] = messages.default || messages;
    return messageCache[locale];
  } catch (error) {
    console.warn(`Failed to load locale ${locale}, falling back to en-US`, error);

    if (locale !== 'en-US' && !messageCache['en-US']) {
      try {
        const fallback = await import(`../locales/en-US.json`);
        messageCache['en-US'] = fallback.default || fallback;
      } catch (fallbackError) {
        console.error('Failed to load fallback locale en-US', fallbackError);
        messageCache['en-US'] = {};
      }
    }

    return messageCache['en-US'] || {};
  }
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, any>) => string;
  formatDate: (date: Date | string) => string;
  formatNumber: (num: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  isLoading: boolean;
  availableLocales: Array<{ code: Locale; name: string; flag: string }>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale;
    if (stored && stored in LOCALE_CONFIGS) return stored;
    if (defaultLocale && defaultLocale in LOCALE_CONFIGS) return defaultLocale;
    return 'en-US';
  });

  const [messages, setMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);

  const setLocale = (newLocale: Locale) => {
    if (newLocale in LOCALE_CONFIGS) {
      setLocaleState(newLocale);
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    loadMessages(locale).then((loadedMessages) => {
      if (mounted) {
        setMessages(loadedMessages);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(() => {
    return (key: string, params?: Record<string, any>): string => {
      const keys = key.split('.');
      let value: any = messages;

      for (const k of keys) {
        value = value?.[k];
      }

      if (typeof value !== 'string') {
        console.warn(`Translation key "${key}" not found`);
        return key;
      }

      if (params) {
        return value.replace(/\{(\w+)\}/g, (match: string, param: string) => {
          return params[param]?.toString() || match;
        });
      }

      return value;
    };
  }, [messages]);

  const formatDate = useMemo(() => {
    return (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    };
  }, [locale]);

  const formatNumber = useMemo(() => {
    const config = LOCALE_CONFIGS[locale];
    return (num: number): string => {
      return num.toLocaleString(locale, config.numberFormat);
    };
  }, [locale]);

  const formatCurrency = useMemo(() => {
    return (amount: number, currency = 'EUR'): string => {
      return amount.toLocaleString(locale, {
        style: 'currency',
        currency,
      });
    };
  }, [locale]);

  const availableLocales = useMemo(() => {
    return Object.entries(LOCALE_CONFIGS).map(([code, config]) => ({
      code: code as Locale,
      name: config.name,
      flag: config.flag,
    }));
  }, []);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    isLoading,
    availableLocales,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within an I18nProvider');
  }
  return context;
}

export { LOCALE_CONFIGS };
