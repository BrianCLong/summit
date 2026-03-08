"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FLAGS = exports.FeatureFlags = void 0;
exports.FeatureFlags = {
    // Example flags
    NEW_SEARCH_ALGORITHM: 'new_search_algorithm',
    BETA_DASHBOARD: 'beta_dashboard',
    DARK_MODE_DEFAULT: 'dark_mode_default',
    // Add new flags here
};
exports.DEFAULT_FLAGS = {
    [exports.FeatureFlags.NEW_SEARCH_ALGORITHM]: false,
    [exports.FeatureFlags.BETA_DASHBOARD]: false,
    [exports.FeatureFlags.DARK_MODE_DEFAULT]: false,
};
