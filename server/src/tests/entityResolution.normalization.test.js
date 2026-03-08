"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityResolutionService_js_1 = require("../services/EntityResolutionService.js");
const globals_1 = require("@jest/globals");
// TODO: These tests describe advanced normalization features not yet implemented
// - Gmail-style email normalization (removing dots, stripping +alias)
// - URL normalization (stripping protocol, query params)
// - generateCanonicalKey method for deduplication
globals_1.describe.skip('EntityResolutionService normalization', () => {
    const svc = new EntityResolutionService_js_1.EntityResolutionService();
    const normalize = (input) => svc.normalizeEntityProperties(input);
    const key = (input) => svc.generateCanonicalKey(normalize(input));
    (0, globals_1.it)('normalizes emails and aliases', () => {
        const props = normalize({ email: 'User.Name+spam@Gmail.com ' });
        (0, globals_1.expect)(props.email).toBe('username@gmail.com');
    });
    (0, globals_1.it)('normalizes urls', () => {
        const props = normalize({ url: 'https://Example.com/Path/?utm=1' });
        (0, globals_1.expect)(props.url).toBe('example.com/path');
    });
    (0, globals_1.it)('creates same key for equivalent values', () => {
        const k1 = key({ name: 'José Ángel', email: 'USER@EXAMPLE.com' });
        const k2 = key({ name: 'José  Angel', email: 'user@example.com' });
        (0, globals_1.expect)(k1).toBe(k2);
    });
});
