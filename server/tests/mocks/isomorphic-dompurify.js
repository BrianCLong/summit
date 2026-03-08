"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMPurify = void 0;
// Mock for isomorphic-dompurify
const DOMPurify = {
    sanitize: (dirty, _config) => {
        // Basic sanitization mock - strips HTML tags
        return dirty.replace(/<[^>]*>/g, '');
    },
    setConfig: (_config) => { },
    clearConfig: () => { },
    isSupported: true,
    addHook: (_entryPoint, _hookFunction) => { },
    removeHook: (_entryPoint) => { },
    removeHooks: (_entryPoint) => { },
    removeAllHooks: () => { },
};
exports.DOMPurify = DOMPurify;
exports.default = DOMPurify;
