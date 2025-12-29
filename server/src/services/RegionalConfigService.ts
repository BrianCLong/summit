import { REGIONAL_CATALOG, RegionalConfig } from '../config/regional.js';

class RegionalConfigServiceImpl {
  private static instance: RegionalConfigServiceImpl;

  private constructor() {}

  public static getInstance(): RegionalConfigServiceImpl {
    if (!RegionalConfigServiceImpl.instance) {
      RegionalConfigServiceImpl.instance = new RegionalConfigServiceImpl();
    }
    return RegionalConfigServiceImpl.instance;
  }

  /**
   * Get regional configuration for a country code.
   * Falls back to US config if country not found.
   */
  public getConfig(countryCode: string): RegionalConfig {
    const config = REGIONAL_CATALOG[countryCode.toUpperCase()];
    if (!config) {
      // Default to US config if country not found
      return REGIONAL_CATALOG['US'];
    }
    return config;
  }

  /**
   * Check if a country code has specific feature enabled.
   */
  public isFeatureEnabled(countryCode: string, feature: keyof RegionalConfig['features']): boolean {
    const config = this.getConfig(countryCode);
    return config.features[feature];
  }

  /**
   * Get all supported country codes.
   */
  public getSupportedCountries(): string[] {
    return Object.keys(REGIONAL_CATALOG);
  }
}

export const regionalConfigService = RegionalConfigServiceImpl.getInstance();
