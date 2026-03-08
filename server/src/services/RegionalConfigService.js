"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionalConfigService = void 0;
const regional_js_1 = require("../config/regional.js");
class RegionalConfigServiceImpl {
    static instance;
    constructor() { }
    static getInstance() {
        if (!RegionalConfigServiceImpl.instance) {
            RegionalConfigServiceImpl.instance = new RegionalConfigServiceImpl();
        }
        return RegionalConfigServiceImpl.instance;
    }
    /**
     * Get regional configuration for a country code.
     * Falls back to US config if country not found.
     */
    getConfig(countryCode) {
        const config = regional_js_1.REGIONAL_CATALOG[countryCode.toUpperCase()];
        if (!config) {
            // Default to US config if country not found
            return regional_js_1.REGIONAL_CATALOG['US'];
        }
        return config;
    }
    /**
     * Check if a country code has specific feature enabled.
     */
    isFeatureEnabled(countryCode, feature) {
        const config = this.getConfig(countryCode);
        return config.features[feature];
    }
    /**
     * Get all supported country codes.
     */
    getSupportedCountries() {
        return Object.keys(regional_js_1.REGIONAL_CATALOG);
    }
}
exports.regionalConfigService = RegionalConfigServiceImpl.getInstance();
