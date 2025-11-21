import type { CountryProfile, ExportPackage } from '../models/types.js';

/**
 * Branding Engine - White-label and customize GovTech solutions for target markets
 */
export interface BrandingConfig {
  countryCode: string;
  countryName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  prefix: string; // e.g., "m-" for Malta, "sg-" for Singapore
  tagline?: string;
  fonts: {
    primary: string;
    secondary: string;
  };
  rtlSupport: boolean;
}

// Pre-defined country branding templates
const COUNTRY_BRANDING_TEMPLATES: Record<string, Partial<BrandingConfig>> = {
  MT: { // Malta
    prefix: 'm-',
    primaryColor: '#CF142B',
    secondaryColor: '#FFFFFF',
    tagline: 'Digital Malta',
  },
  FI: { // Finland
    prefix: 'suomi-',
    primaryColor: '#003580',
    secondaryColor: '#FFFFFF',
    tagline: 'Digital Finland',
  },
  SG: { // Singapore
    prefix: 'sg-',
    primaryColor: '#EF3340',
    secondaryColor: '#FFFFFF',
    tagline: 'Smart Nation Singapore',
  },
  AE: { // UAE
    prefix: 'uae-',
    primaryColor: '#00732F',
    secondaryColor: '#FFFFFF',
    rtlSupport: true,
    tagline: 'Digital UAE',
  },
  JP: { // Japan
    prefix: 'digi-',
    primaryColor: '#BC002D',
    secondaryColor: '#FFFFFF',
    tagline: 'Digital Japan',
  },
  KR: { // South Korea
    prefix: 'k-',
    primaryColor: '#003478',
    secondaryColor: '#FFFFFF',
    tagline: 'Digital Korea',
  },
  BR: { // Brazil
    prefix: 'gov-',
    primaryColor: '#009C3B',
    secondaryColor: '#FFDF00',
    tagline: 'Brasil Digital',
  },
  IN: { // India
    prefix: 'digi-',
    primaryColor: '#FF9933',
    secondaryColor: '#138808',
    tagline: 'Digital India',
  },
  NG: { // Nigeria
    prefix: 'ng-',
    primaryColor: '#008751',
    secondaryColor: '#FFFFFF',
    tagline: 'Digital Nigeria',
  },
  KE: { // Kenya
    prefix: 'e-',
    primaryColor: '#006600',
    secondaryColor: '#BB0000',
    tagline: 'Digital Kenya',
  },
};

export class BrandingEngine {
  /**
   * Generate branding configuration for a target country
   */
  generateBranding(country: CountryProfile): BrandingConfig {
    const template = COUNTRY_BRANDING_TEMPLATES[country.code] || {};

    // Check if any official language uses RTL
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    const needsRtl = country.localization.officialLanguages.some(
      lang => rtlLanguages.includes(lang.toLowerCase())
    );

    return {
      countryCode: country.code,
      countryName: country.name,
      primaryColor: template.primaryColor || '#0066CC',
      secondaryColor: template.secondaryColor || '#FFFFFF',
      accentColor: '#FF6600',
      prefix: template.prefix || `${country.code.toLowerCase()}-`,
      tagline: template.tagline || `e-${country.name}`,
      fonts: {
        primary: 'Inter',
        secondary: 'Source Sans Pro',
      },
      rtlSupport: needsRtl || template.rtlSupport || false,
    };
  }

  /**
   * Generate service naming for a country
   */
  generateServiceNames(
    originalNames: string[],
    branding: BrandingConfig
  ): Map<string, string> {
    const nameMap = new Map<string, string>();

    for (const name of originalNames) {
      // Transform Estonian naming to country-specific
      let newName = name
        .replace(/^e-/i, `${branding.prefix}`)
        .replace(/^i-/i, `${branding.prefix}`)
        .replace(/X-Road/i, `${branding.countryName}-Road`)
        .replace(/Smart-ID/i, `${branding.prefix}ID`)
        .replace(/Mobile-ID/i, `${branding.prefix}Mobile`);

      nameMap.set(name, newName);
    }

    return nameMap;
  }

  /**
   * Generate CSS theme variables for white-labeling
   */
  generateThemeCSS(branding: BrandingConfig): string {
    return `
:root {
  /* ${branding.countryName} GovTech Theme */
  --color-primary: ${branding.primaryColor};
  --color-secondary: ${branding.secondaryColor};
  --color-accent: ${branding.accentColor};

  --font-primary: '${branding.fonts.primary}', system-ui, sans-serif;
  --font-secondary: '${branding.fonts.secondary}', system-ui, sans-serif;

  --direction: ${branding.rtlSupport ? 'rtl' : 'ltr'};
  --text-align: ${branding.rtlSupport ? 'right' : 'left'};

  /* Government branding */
  --gov-prefix: '${branding.prefix}';
  --gov-tagline: '${branding.tagline}';
}

/* RTL Support */
${branding.rtlSupport ? `
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}
` : ''}
`.trim();
  }

  /**
   * Generate localization configuration
   */
  generateLocalizationConfig(country: CountryProfile): object {
    return {
      defaultLocale: country.localization.officialLanguages[0],
      supportedLocales: country.localization.officialLanguages,
      fallbackLocale: 'en',
      currency: {
        code: country.localization.currencyCode,
        symbol: this.getCurrencySymbol(country.localization.currencyCode),
      },
      dateFormat: country.localization.dateFormat,
      timezone: country.localization.timezone,
      numberFormat: {
        decimal: country.code === 'US' ? '.' : ',',
        thousands: country.code === 'US' ? ',' : ' ',
      },
    };
  }

  private getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
      EUR: '\u20AC',
      USD: '$',
      GBP: '\u00A3',
      JPY: '\u00A5',
      SGD: 'S$',
      AED: '\u062F.\u0625',
      INR: '\u20B9',
      BRL: 'R$',
      KRW: '\u20A9',
      NGN: '\u20A6',
      KES: 'KSh',
    };
    return symbols[code] || code;
  }
}
