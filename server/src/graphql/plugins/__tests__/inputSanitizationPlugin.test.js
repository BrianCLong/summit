"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const inputSanitizationPlugin_js_1 = require("../inputSanitizationPlugin.js");
(0, globals_1.describe)('createInputSanitizationPlugin', () => {
    (0, globals_1.it)('should be defined', () => {
        const plugin = (0, inputSanitizationPlugin_js_1.createInputSanitizationPlugin)();
        (0, globals_1.expect)(plugin).toBeDefined();
    });
    (0, globals_1.it)('should return a plugin object', () => {
        const plugin = (0, inputSanitizationPlugin_js_1.createInputSanitizationPlugin)();
        (0, globals_1.expect)(plugin.requestDidStart).toBeDefined();
    });
    (0, globals_1.describe)('didResolveOperation', () => {
        const plugin = (0, inputSanitizationPlugin_js_1.createInputSanitizationPlugin)();
        let didResolveOperation;
        (0, globals_1.beforeEach)(async () => {
            const listener = await plugin.requestDidStart({});
            if (listener && typeof listener === 'object' && 'didResolveOperation' in listener) {
                didResolveOperation = listener.didResolveOperation;
            }
        });
        (0, globals_1.it)('should sanitize string inputs by trimming whitespace', async () => {
            const request = {
                variables: {
                    name: '  John Doe  ',
                    description: '  Some description  ',
                },
                operationName: 'TestOperation',
            };
            await didResolveOperation({ request });
            (0, globals_1.expect)(request.variables.name).toBe('John Doe');
            (0, globals_1.expect)(request.variables.description).toBe('Some description');
        });
        (0, globals_1.it)('should remove null bytes from string inputs', async () => {
            const request = {
                variables: {
                    content: 'Hello\u0000World',
                },
                operationName: 'TestOperation',
            };
            await didResolveOperation({ request });
            (0, globals_1.expect)(request.variables.content).toBe('HelloWorld');
        });
        (0, globals_1.it)('should handle nested objects', async () => {
            const request = {
                variables: {
                    user: {
                        name: '  Alice  ',
                        profile: {
                            bio: '  I am Alice  ',
                        },
                    },
                },
                operationName: 'TestOperation',
            };
            await didResolveOperation({ request });
            (0, globals_1.expect)(request.variables.user.name).toBe('Alice');
            (0, globals_1.expect)(request.variables.user.profile.bio).toBe('I am Alice');
        });
        (0, globals_1.it)('should handle arrays', async () => {
            const request = {
                variables: {
                    tags: ['  tag1  ', '  tag2  '],
                },
                operationName: 'TestOperation',
            };
            await didResolveOperation({ request });
            (0, globals_1.expect)(request.variables.tags[0]).toBe('tag1');
            (0, globals_1.expect)(request.variables.tags[1]).toBe('tag2');
        });
        (0, globals_1.it)('should throw error for deeply nested objects', async () => {
            const deepObject = { level1: {} };
            let current = deepObject.level1;
            for (let i = 2; i <= 15; i++) {
                current[`level${i}`] = {};
                current = current[`level${i}`];
            }
            const request = {
                variables: deepObject,
                operationName: 'TestOperation',
            };
            await (0, globals_1.expect)(didResolveOperation({ request })).rejects.toThrow(/Input object is too deep/);
        });
        (0, globals_1.it)('should throw error for string input exceeding max length', async () => {
            const longString = 'a'.repeat(10001);
            const request = {
                variables: {
                    data: longString,
                },
                operationName: 'TestOperation',
            };
            await (0, globals_1.expect)(didResolveOperation({ request })).rejects.toThrow(/Input string is too long/);
        });
        (0, globals_1.it)('should not throw for valid depth', async () => {
            const deepObject = { level1: { level2: { level3: "value" } } };
            const request = {
                variables: deepObject,
                operationName: 'TestOperation',
            };
            await (0, globals_1.expect)(didResolveOperation({ request })).resolves.not.toThrow();
        });
    });
});
