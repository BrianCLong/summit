import type { CountryProfile } from '../models/types.js';

/**
 * Sample country profiles for testing and demonstration
 */
export const SampleCountries: Record<string, CountryProfile> = {
  MT: {
    code: 'MT',
    name: 'Malta',
    region: 'EU',
    population: 520_000,
    gdpPerCapita: 32_000,
    infrastructure: {
      internetPenetration: 87,
      mobileSubscriptions: 620_000,
      digitalLiteracy: 'high',
      existingEgov: ['taxation', 'social_services'],
    },
    regulatory: {
      dataProtectionLaw: 'GDPR',
      eSignatureLaw: true,
      cloudPolicy: 'flexible',
      gdprCompliant: true,
    },
    localization: {
      officialLanguages: ['mt', 'en'],
      currencyCode: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Europe/Malta',
    },
    priorities: ['identity', 'business', 'healthcare'],
  },

  SG: {
    code: 'SG',
    name: 'Singapore',
    region: 'APAC',
    population: 5_900_000,
    gdpPerCapita: 65_000,
    infrastructure: {
      internetPenetration: 92,
      mobileSubscriptions: 8_500_000,
      digitalLiteracy: 'high',
      existingEgov: ['identity', 'taxation', 'business', 'healthcare'],
    },
    regulatory: {
      dataProtectionLaw: 'PDPA',
      eSignatureLaw: true,
      cloudPolicy: 'flexible',
      gdprCompliant: false,
    },
    localization: {
      officialLanguages: ['en', 'zh', 'ms', 'ta'],
      currencyCode: 'SGD',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Singapore',
    },
    priorities: ['voting', 'land_registry', 'cybersecurity'],
  },

  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    region: 'MEA',
    population: 10_000_000,
    gdpPerCapita: 44_000,
    infrastructure: {
      internetPenetration: 99,
      mobileSubscriptions: 20_000_000,
      digitalLiteracy: 'high',
      existingEgov: ['identity', 'business'],
    },
    regulatory: {
      dataProtectionLaw: 'PDPL',
      eSignatureLaw: true,
      cloudPolicy: 'regional',
      gdprCompliant: false,
    },
    localization: {
      officialLanguages: ['ar', 'en'],
      currencyCode: 'AED',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Dubai',
    },
    priorities: ['governance', 'healthcare', 'education'],
  },

  KE: {
    code: 'KE',
    name: 'Kenya',
    region: 'MEA',
    population: 54_000_000,
    gdpPerCapita: 2_100,
    infrastructure: {
      internetPenetration: 42,
      mobileSubscriptions: 65_000_000,
      digitalLiteracy: 'medium',
      existingEgov: ['taxation'],
    },
    regulatory: {
      dataProtectionLaw: 'DPA 2019',
      eSignatureLaw: false,
      cloudPolicy: 'local_only',
      gdprCompliant: false,
    },
    localization: {
      officialLanguages: ['en', 'sw'],
      currencyCode: 'KES',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Africa/Nairobi',
    },
    priorities: ['identity', 'business', 'land_registry'],
  },

  BR: {
    code: 'BR',
    name: 'Brazil',
    region: 'Americas',
    population: 215_000_000,
    gdpPerCapita: 8_900,
    infrastructure: {
      internetPenetration: 81,
      mobileSubscriptions: 220_000_000,
      digitalLiteracy: 'medium',
      existingEgov: ['taxation', 'voting'],
    },
    regulatory: {
      dataProtectionLaw: 'LGPD',
      eSignatureLaw: true,
      cloudPolicy: 'regional',
      gdprCompliant: false,
    },
    localization: {
      officialLanguages: ['pt'],
      currencyCode: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'America/Sao_Paulo',
    },
    priorities: ['healthcare', 'education', 'identity'],
  },
};

/**
 * Get a sample country profile by code
 */
export function getSampleCountry(code: string): CountryProfile | undefined {
  return SampleCountries[code.toUpperCase()];
}

/**
 * List all available sample country codes
 */
export function listSampleCountryCodes(): string[] {
  return Object.keys(SampleCountries);
}
