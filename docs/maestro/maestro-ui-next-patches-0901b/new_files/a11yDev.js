"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = enableA11yIfWanted;
// Lightweight dev-only a11y checker using @axe-core/react. No prod impact.
// Enable by setting: window.__MAESTRO_CFG__.a11y = 'on'
async function enableA11yIfWanted(React, ReactDOM) {
    try {
        if (process.env.NODE_ENV === 'development') {
            const cfg = window.__MAESTRO_CFG__ || {};
            if (cfg.a11y === 'on') {
                const axe = await Promise.resolve().then(() => __importStar(require('@axe-core/react')));
                axe.default(React, ReactDOM, 1000);
                // eslint-disable-next-line no-console
                console.log('[A11y] axe-core/react enabled');
            }
        }
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[A11y] axe not enabled:', e);
    }
}
