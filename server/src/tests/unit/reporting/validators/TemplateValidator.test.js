"use strict";
/**
 * Tests for TemplateValidator
 */
Object.defineProperty(exports, "__esModule", { value: true });
const TemplateValidator_js_1 = require("../../../../services/reporting/validators/TemplateValidator.js");
const ReportRequestValidator_js_1 = require("../../../../services/reporting/validators/ReportRequestValidator.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('TemplateValidator', () => {
    (0, globals_1.describe)('validateCustomTemplate', () => {
        (0, globals_1.it)('should validate a correct custom template', () => {
            const template = {
                name: 'Custom Investigation Template',
                description: 'Custom template for specific investigation types',
                sections: ['header', 'summary', 'findings'],
                exportFormats: ['pdf', 'docx'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).not.toThrow();
        });
        (0, globals_1.it)('should throw ValidationError for missing name', () => {
            const template = {
                name: '',
                sections: ['header'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('name');
                (0, globals_1.expect)(error.code).toBe('REQUIRED');
            }
        });
        (0, globals_1.it)('should throw ValidationError for name exceeding max length', () => {
            const template = {
                name: 'x'.repeat(201),
                sections: ['header'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('name');
                (0, globals_1.expect)(error.code).toBe('MAX_LENGTH');
            }
        });
        (0, globals_1.it)('should throw ValidationError for empty sections array', () => {
            const template = {
                name: 'Test Template',
                sections: [],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('sections');
                (0, globals_1.expect)(error.code).toBe('REQUIRED');
            }
        });
        (0, globals_1.it)('should throw ValidationError for non-array sections', () => {
            const template = {
                name: 'Test Template',
                sections: 'not-an-array',
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
        });
        (0, globals_1.it)('should throw ValidationError for invalid section names', () => {
            const template = {
                name: 'Test Template',
                sections: ['valid_section', ''],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('sections');
                (0, globals_1.expect)(error.code).toBe('INVALID_FORMAT');
            }
        });
        (0, globals_1.it)('should throw ValidationError for invalid export format', () => {
            const template = {
                name: 'Test Template',
                sections: ['header'],
                exportFormats: ['pdf', 'invalid_format'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('exportFormats');
                (0, globals_1.expect)(error.code).toBe('INVALID_FORMAT');
                (0, globals_1.expect)(error.message).toContain('invalid_format');
            }
        });
        (0, globals_1.it)('should accept all valid export formats', () => {
            const validFormats = ['pdf', 'docx', 'html', 'json', 'csv', 'xlsx', 'pptx', 'gexf'];
            for (const format of validFormats) {
                const template = {
                    name: 'Test Template',
                    sections: ['header'],
                    exportFormats: [format],
                };
                (0, globals_1.expect)(() => {
                    TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
                }).not.toThrow();
            }
        });
        (0, globals_1.it)('should throw ValidationError for description exceeding max length', () => {
            const template = {
                name: 'Test Template',
                description: 'x'.repeat(1001),
                sections: ['header'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('description');
                (0, globals_1.expect)(error.code).toBe('MAX_LENGTH');
            }
        });
        (0, globals_1.it)('should accept template without exportFormats', () => {
            const template = {
                name: 'Test Template',
                sections: ['header'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).not.toThrow();
        });
        (0, globals_1.it)('should accept template without description', () => {
            const template = {
                name: 'Test Template',
                sections: ['header'],
            };
            (0, globals_1.expect)(() => {
                TemplateValidator_js_1.TemplateValidator.validateCustomTemplate(template);
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('isValidSectionName', () => {
        (0, globals_1.it)('should accept valid section names', () => {
            const validNames = [
                'executive_summary',
                'key_findings',
                'section_1',
                'my_section',
                'a',
            ];
            for (const name of validNames) {
                (0, globals_1.expect)(TemplateValidator_js_1.TemplateValidator.isValidSectionName(name)).toBe(true);
            }
        });
        (0, globals_1.it)('should reject invalid section names', () => {
            const invalidNames = [
                'Executive Summary', // Spaces
                'section-name', // Hyphens
                '123section', // Starts with number
                'section!', // Special characters
                '', // Empty
                'UPPERCASE', // Uppercase
            ];
            for (const name of invalidNames) {
                (0, globals_1.expect)(TemplateValidator_js_1.TemplateValidator.isValidSectionName(name)).toBe(false);
            }
        });
    });
});
