/**
 * Locale Adapter for AI Marketplace
 * Provides on-demand localization for marketplace experiences
 */

// Supported locale regions
const LOCALE_REGIONS = {
  americas: ['en-US', 'es-MX', 'es-AR', 'pt-BR', 'fr-CA'],
  europe: ['en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'nl-NL', 'pl-PL', 'uk-UA'],
  asiaPacific: ['ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'th-TH', 'vi-VN', 'id-ID'],
  middleEast: ['ar-SA', 'ar-AE', 'he-IL', 'fa-IR', 'tr-TR'],
  africa: ['en-ZA', 'fr-SN', 'sw-KE'],
  southAsia: ['hi-IN', 'bn-BD', 'ta-IN', 'ur-PK'],
  oceania: ['en-AU', 'en-NZ'],
} as const;

// RTL locales
const RTL_LOCALES = new Set(['ar-SA', 'ar-AE', 'he-IL', 'fa-IR', 'ur-PK']);

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  isRTL: boolean;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
}

export class LocaleAdapter {
  private localeConfigs: Map<string, LocaleConfig> = new Map();

  constructor() {
    this.initializeLocales();
  }

  /**
   * Get locale configuration
   */
  getLocaleConfig(locale: string): LocaleConfig | undefined {
    return this.localeConfigs.get(locale) || this.localeConfigs.get(locale.split('-')[0]);
  }

  /**
   * Check if locale is supported
   */
  isSupported(locale: string): boolean {
    return this.localeConfigs.has(locale) || this.localeConfigs.has(locale.split('-')[0]);
  }

  /**
   * Check if locale is RTL
   */
  isRTL(locale: string): boolean {
    return RTL_LOCALES.has(locale);
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): string[] {
    return Array.from(this.localeConfigs.keys());
  }

  /**
   * Get locales by region
   */
  getLocalesByRegion(region: keyof typeof LOCALE_REGIONS): string[] {
    return [...LOCALE_REGIONS[region]];
  }

  /**
   * Format price for locale
   */
  formatPrice(amount: number, currency: string, locale: string): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Format date for locale
   */
  formatDate(date: Date, locale: string): string {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Get best matching locale from preferences
   */
  getBestMatch(preferredLocales: string[], availableLocales: string[]): string | null {
    // Exact match
    for (const pref of preferredLocales) {
      if (availableLocales.includes(pref)) {
        return pref;
      }
    }

    // Language match (ignore region)
    for (const pref of preferredLocales) {
      const lang = pref.split('-')[0];
      const match = availableLocales.find(l => l.startsWith(lang));
      if (match) return match;
    }

    return null;
  }

  private initializeLocales(): void {
    const configs: LocaleConfig[] = [
      { code: 'en-US', name: 'English (US)', nativeName: 'English', region: 'americas', isRTL: false, dateFormat: 'MM/DD/YYYY', numberFormat: { decimal: '.', thousands: ',', currency: '$' } },
      { code: 'en-GB', name: 'English (UK)', nativeName: 'English', region: 'europe', isRTL: false, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: '.', thousands: ',', currency: '£' } },
      { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español', region: 'europe', isRTL: false, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: '.', currency: '€' } },
      { code: 'fr-FR', name: 'French', nativeName: 'Français', region: 'europe', isRTL: false, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: ' ', currency: '€' } },
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch', region: 'europe', isRTL: false, dateFormat: 'DD.MM.YYYY', numberFormat: { decimal: ',', thousands: '.', currency: '€' } },
      { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', region: 'asiaPacific', isRTL: false, dateFormat: 'YYYY/MM/DD', numberFormat: { decimal: '.', thousands: ',', currency: '¥' } },
      { code: 'ko-KR', name: 'Korean', nativeName: '한국어', region: 'asiaPacific', isRTL: false, dateFormat: 'YYYY.MM.DD', numberFormat: { decimal: '.', thousands: ',', currency: '₩' } },
      { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'asiaPacific', isRTL: false, dateFormat: 'YYYY-MM-DD', numberFormat: { decimal: '.', thousands: ',', currency: '¥' } },
      { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', region: 'middleEast', isRTL: true, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: '٫', thousands: '٬', currency: 'ر.س' } },
      { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', region: 'americas', isRTL: false, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: '.', currency: 'R$' } },
      { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', region: 'southAsia', isRTL: false, dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: '.', thousands: ',', currency: '₹' } },
    ];

    for (const config of configs) {
      this.localeConfigs.set(config.code, config);
    }
  }
}

export const localeAdapter = new LocaleAdapter();
