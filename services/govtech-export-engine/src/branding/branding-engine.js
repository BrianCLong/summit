"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingEngine = void 0;
// Pre-defined country branding templates
const COUNTRY_BRANDING_TEMPLATES = {
    MT: {
        prefix: 'm-',
        primaryColor: '#CF142B',
        secondaryColor: '#FFFFFF',
        tagline: 'Digital Malta',
    },
    FI: {
        prefix: 'suomi-',
        primaryColor: '#003580',
        secondaryColor: '#FFFFFF',
        tagline: 'Digital Finland',
    },
    SG: {
        prefix: 'sg-',
        primaryColor: '#EF3340',
        secondaryColor: '#FFFFFF',
        tagline: 'Smart Nation Singapore',
    },
    AE: {
        prefix: 'uae-',
        primaryColor: '#00732F',
        secondaryColor: '#FFFFFF',
        rtlSupport: true,
        tagline: 'Digital UAE',
    },
    JP: {
        prefix: 'digi-',
        primaryColor: '#BC002D',
        secondaryColor: '#FFFFFF',
        tagline: 'Digital Japan',
    },
    KR: {
        prefix: 'k-',
        primaryColor: '#003478',
        secondaryColor: '#FFFFFF',
        tagline: 'Digital Korea',
    },
    BR: {
        prefix: 'gov-',
        primaryColor: '#009C3B',
        secondaryColor: '#FFDF00',
        tagline: 'Brasil Digital',
    },
    IN: {
        prefix: 'digi-',
        primaryColor: '#FF9933',
        secondaryColor: '#138808',
        tagline: 'Digital India',
    },
    NG: {
        prefix: 'ng-',
        primaryColor: '#008751',
        secondaryColor: '#FFFFFF',
        tagline: 'Digital Nigeria',
    },
    KE: {
        prefix: 'e-',
        primaryColor: '#006600',
        secondaryColor: '#BB0000',
        tagline: 'Digital Kenya',
    },
};
class BrandingEngine {
    /**
     * Generate branding configuration for a target country
     */
    generateBranding(country) {
        const template = COUNTRY_BRANDING_TEMPLATES[country.code] || {};
        // Check if any official language uses RTL
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        const needsRtl = country.localization.officialLanguages.some(lang => rtlLanguages.includes(lang.toLowerCase()));
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
    generateServiceNames(originalNames, branding) {
        const nameMap = new Map();
        for (const name of originalNames) {
            // Transform Estonian naming to country-specific
            const newName = name
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
    generateThemeCSS(branding) {
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
    generateLocalizationConfig(country) {
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
    getCurrencySymbol(code) {
        const symbols = {
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
exports.BrandingEngine = BrandingEngine;
