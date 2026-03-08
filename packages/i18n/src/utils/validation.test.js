"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validation_1 = require("./validation");
(0, vitest_1.describe)('flattenMessages', () => {
    (0, vitest_1.it)('should flatten nested messages', () => {
        const messages = {
            common: {
                save: 'Save',
                cancel: 'Cancel',
            },
            auth: {
                login: 'Login',
            },
        };
        const flat = (0, validation_1.flattenMessages)(messages);
        (0, vitest_1.expect)(flat).toEqual({
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'auth.login': 'Login',
        });
    });
    (0, vitest_1.it)('should handle deeply nested messages', () => {
        const messages = {
            level1: {
                level2: {
                    level3: {
                        value: 'Deep value',
                    },
                },
            },
        };
        const flat = (0, validation_1.flattenMessages)(messages);
        (0, vitest_1.expect)(flat).toEqual({
            'level1.level2.level3.value': 'Deep value',
        });
    });
    (0, vitest_1.it)('should handle empty object', () => {
        const flat = (0, validation_1.flattenMessages)({});
        (0, vitest_1.expect)(flat).toEqual({});
    });
});
(0, vitest_1.describe)('extractInterpolations', () => {
    (0, vitest_1.it)('should extract simple interpolation variables', () => {
        const vars = (0, validation_1.extractInterpolations)('Hello {name}!');
        (0, vitest_1.expect)(vars).toEqual(['name']);
    });
    (0, vitest_1.it)('should extract multiple variables', () => {
        const vars = (0, validation_1.extractInterpolations)('Welcome {name}, you have {count} messages');
        (0, vitest_1.expect)(vars).toEqual(['name', 'count']);
    });
    (0, vitest_1.it)('should return empty array for no variables', () => {
        const vars = (0, validation_1.extractInterpolations)('No variables here');
        (0, vitest_1.expect)(vars).toEqual([]);
    });
    (0, vitest_1.it)('should handle duplicate variables', () => {
        const vars = (0, validation_1.extractInterpolations)('{name} said hello to {name}');
        (0, vitest_1.expect)(vars).toEqual(['name', 'name']);
    });
});
(0, vitest_1.describe)('validateTranslations', () => {
    const baseMessages = {
        common: {
            save: 'Save',
            cancel: 'Cancel',
            greeting: 'Hello {name}!',
        },
    };
    (0, vitest_1.it)('should detect missing keys', () => {
        const targetMessages = {
            common: {
                save: 'Guardar',
                // missing 'cancel' and 'greeting'
            },
        };
        const result = (0, validation_1.validateTranslations)('en-US', 'es-ES', baseMessages, targetMessages);
        (0, vitest_1.expect)(result.missingKeys).toContain('common.cancel');
        (0, vitest_1.expect)(result.missingKeys).toContain('common.greeting');
    });
    (0, vitest_1.it)('should detect empty values', () => {
        const targetMessages = {
            common: {
                save: '',
                cancel: 'Cancelar',
                greeting: 'Hola {name}!',
            },
        };
        const result = (0, validation_1.validateTranslations)('en-US', 'es-ES', baseMessages, targetMessages);
        (0, vitest_1.expect)(result.emptyValues).toContain('common.save');
    });
    (0, vitest_1.it)('should detect invalid interpolations', () => {
        const targetMessages = {
            common: {
                save: 'Guardar',
                cancel: 'Cancelar',
                greeting: 'Hola!', // missing {name}
            },
        };
        const result = (0, validation_1.validateTranslations)('en-US', 'es-ES', baseMessages, targetMessages);
        (0, vitest_1.expect)(result.invalidInterpolations.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should calculate coverage correctly', () => {
        const targetMessages = {
            common: {
                save: 'Guardar',
                cancel: 'Cancelar',
                greeting: 'Hola {name}!',
            },
        };
        const result = (0, validation_1.validateTranslations)('en-US', 'es-ES', baseMessages, targetMessages);
        (0, vitest_1.expect)(result.coverage).toBe(100);
    });
});
(0, vitest_1.describe)('findDuplicateTranslations', () => {
    (0, vitest_1.it)('should find duplicate values', () => {
        const messages = {
            button1: 'Save',
            button2: 'save', // Same value (case-insensitive)
            button3: 'Cancel',
        };
        const duplicates = (0, validation_1.findDuplicateTranslations)(messages);
        (0, vitest_1.expect)(duplicates.size).toBeGreaterThan(0);
        (0, vitest_1.expect)(duplicates.get('save')).toEqual(['button1', 'button2']);
    });
    (0, vitest_1.it)('should return empty map for unique values', () => {
        const messages = {
            button1: 'Save',
            button2: 'Cancel',
            button3: 'Delete',
        };
        const duplicates = (0, validation_1.findDuplicateTranslations)(messages);
        (0, vitest_1.expect)(duplicates.size).toBe(0);
    });
});
(0, vitest_1.describe)('validateICUFormat', () => {
    (0, vitest_1.it)('should validate correct ICU format', () => {
        const result = (0, validation_1.validateICUFormat)('{count, plural, one {# item} other {# items}}');
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.errors).toEqual([]);
    });
    (0, vitest_1.it)('should detect unmatched braces', () => {
        const result = (0, validation_1.validateICUFormat)('Hello {name');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect missing other in plural', () => {
        const result = (0, validation_1.validateICUFormat)('{count, plural, one {# item}}');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors).toContain(vitest_1.expect.stringContaining('missing required \'other\' case'));
    });
    (0, vitest_1.it)('should validate simple interpolation', () => {
        const result = (0, validation_1.validateICUFormat)('Hello {name}!');
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
});
