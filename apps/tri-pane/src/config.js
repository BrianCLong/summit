"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVED_VIEWS_VERSION = exports.featureFlags = void 0;
exports.featureFlags = {
    savedViews: (import.meta.env.VITE_UI_SAVED_VIEWS ?? 'true') !== 'false'
};
exports.SAVED_VIEWS_VERSION = 1;
