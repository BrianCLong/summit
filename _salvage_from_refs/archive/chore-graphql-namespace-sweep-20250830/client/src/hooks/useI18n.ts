import { useState, useEffect, useMemo } from 'react';

export type Locale = 
  | 'en-US' // English (United States)
  | 'en-GB' // English (United Kingdom) 
  | 'fr-FR' // French (France)
  | 'de-DE' // German (Germany)
  | 'it-IT' // Italian (Italy)
  | 'es-ES' // Spanish (Spain)
  | 'pt-PT' // Portuguese (Portugal)
  | 'nl-NL' // Dutch (Netherlands)
  | 'da-DK' // Danish (Denmark)
  | 'no-NO' // Norwegian (Norway)
  | 'sv-SE' // Swedish (Sweden)
  | 'fi-FI' // Finnish (Finland)
  | 'is-IS' // Icelandic (Iceland)
  | 'pl-PL' // Polish (Poland)
  | 'cs-CZ' // Czech (Czech Republic)
  | 'sk-SK' // Slovak (Slovakia)
  | 'hu-HU' // Hungarian (Hungary)
  | 'ro-RO' // Romanian (Romania)
  | 'bg-BG' // Bulgarian (Bulgaria)
  | 'hr-HR' // Croatian (Croatia)
  | 'sl-SI' // Slovenian (Slovenia)
  | 'et-EE' // Estonian (Estonia)
  | 'lv-LV' // Latvian (Latvia)
  | 'lt-LT' // Lithuanian (Lithuania)
  | 'mt-MT' // Maltese (Malta)
  | 'tr-TR' // Turkish (Turkey)
  | 'el-GR' // Greek (Greece)
  | 'mk-MK' // Macedonian (North Macedonia)
  | 'al-AL' // Albanian (Albania)
  | 'me-ME' // Montenegrin (Montenegro)
;

interface Messages {
  [key: string]: string | Messages;
}

// Base English messages
const EN_MESSAGES: Messages = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    refresh: 'Refresh',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
  },
  navigation: {
    dashboard: 'Dashboard',
    investigations: 'Investigations',
    graphWorkbench: 'Graph Workbench',
    reports: 'Reports',
    settings: 'Settings',
  },
  presence: {
    active: 'active',
    away: 'away',
    busy: 'busy',
    offline: 'offline',
    usersOnline: '{count} users online',
  },
  graph: {
    nodes: 'Nodes',
    edges: 'Edges',
    paths: 'Paths',
    neighbors: 'Neighbors',
    streaming: 'Streaming',
    findPaths: 'Find Paths',
    shortestPaths: 'Shortest Paths',
    pathLength: 'Path Length',
  },
  search: {
    powerSearch: 'Power Search',
    savedSearches: 'Saved Searches',
    bulkActions: 'Bulk Actions',
    queryBuilder: 'Query Builder',
    addFilter: 'Add Filter',
    clearFilters: 'Clear Filters',
  },
  reports: {
    generateReport: 'Generate Report',
    executiveSummary: 'Executive Summary',
    forensicsReport: 'Forensics Report',
    reportTemplate: 'Report Template',
    exportFormat: 'Export Format',
  },
  performance: {
    fps: 'FPS',
    performance: 'Performance',
    budget: 'Budget',
    lighthouse: 'Lighthouse',
  },
  dates: {
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
  },
};

// Locale configurations
const LOCALE_CONFIGS: Record<Locale, { 
  flag: string; 
  name: string; 
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
}> = {
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

/**
 * i18n hook with NATO locale support
 */
export function useI18n() {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale;
    return stored && stored in LOCALE_CONFIGS ? stored : 'en-US';
  });

  const [messages, setMessages] = useState<Messages>(EN_MESSAGES);

  // Load messages for current locale
  useEffect(() => {
    if (locale === 'en-US') {
      setMessages(EN_MESSAGES);
      return;
    }

    // In production, these would be loaded dynamically
    // For now, we'll fall back to English
    setMessages(EN_MESSAGES);
  }, [locale]);

  // Persist locale preference
  useEffect(() => {
    localStorage.setItem('locale', locale);
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
      
      // Simple parameter interpolation
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match: string, param: string) => {
          return params[param]?.toString() || match;
        });
      }
      
      return value;
    };
  }, [messages]);

  const formatDate = useMemo(() => {
    const config = LOCALE_CONFIGS[locale];
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

  return {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    availableLocales: Object.entries(LOCALE_CONFIGS).map(([code, config]) => ({
      code: code as Locale,
      name: config.name,
      flag: config.flag,
    })),
  };
}