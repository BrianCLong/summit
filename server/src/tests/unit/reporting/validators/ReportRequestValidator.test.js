"use strict";
/**
 * Tests for ReportRequestValidator
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ReportRequestValidator_js_1 = require("../../../../services/reporting/validators/ReportRequestValidator.js");
const mock_templates_js_1 = require("../../../fixtures/reporting/mock-templates.js");
const test_helpers_js_1 = require("../../../fixtures/reporting/test-helpers.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('ReportRequestValidator', () => {
    (0, globals_1.describe)('validate', () => {
        (0, globals_1.it)('should validate a correct report request', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                templateId: 'INVESTIGATION_SUMMARY',
                parameters: {
                    investigationId: 'inv-123',
                    summaryLevel: 'detailed',
                },
                userId: 'analyst-123',
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).not.toThrow();
        });
        (0, globals_1.it)('should throw ValidationError for missing templateId', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({ templateId: '' });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(ReportRequestValidator_js_1.ValidationError);
                (0, globals_1.expect)(error.field).toBe('templateId');
                (0, globals_1.expect)(error.code).toBe('REQUIRED');
            }
        });
        (0, globals_1.it)('should throw ValidationError for missing userId', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({ userId: '' });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
        });
        (0, globals_1.it)('should throw ValidationError for missing required parameter', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {}, // Missing investigationId
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('investigationId');
                (0, globals_1.expect)(error.message).toContain('investigationId');
            }
        });
        (0, globals_1.it)('should throw ValidationError for invalid enum value', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {
                    investigationId: 'inv-123',
                    summaryLevel: 'invalid', // Not in ['brief', 'detailed', 'comprehensive']
                },
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('summaryLevel');
                (0, globals_1.expect)(error.code).toBe('INVALID_ENUM');
            }
        });
        (0, globals_1.it)('should throw ValidationError for invalid parameter type', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {
                    investigationId: 123, // Should be string
                },
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }
            catch (error) {
                (0, globals_1.expect)(error.code).toBe('INVALID_TYPE');
            }
        });
        (0, globals_1.it)('should throw ValidationError for unsupported format', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                format: 'INVALID_FORMAT',
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
            try {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }
            catch (error) {
                (0, globals_1.expect)(error.field).toBe('format');
                (0, globals_1.expect)(error.code).toBe('INVALID_FORMAT');
            }
        });
        (0, globals_1.it)('should accept valid enum values', () => {
            for (const level of ['brief', 'detailed', 'comprehensive']) {
                const request = (0, test_helpers_js_1.createMockReportRequest)({
                    parameters: {
                        investigationId: 'inv-123',
                        summaryLevel: level,
                    },
                });
                (0, globals_1.expect)(() => {
                    ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
                }).not.toThrow();
            }
        });
        (0, globals_1.it)('should accept valid formats (case insensitive)', () => {
            for (const format of ['PDF', 'pdf', 'DOCX', 'docx', 'HTML', 'html']) {
                const request = (0, test_helpers_js_1.createMockReportRequest)({
                    format: format,
                });
                (0, globals_1.expect)(() => {
                    ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
                }).not.toThrow();
            }
        });
        (0, globals_1.it)('should handle optional parameters correctly', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {
                    investigationId: 'inv-123',
                    // timeRange is optional, not provided
                },
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).not.toThrow();
        });
        (0, globals_1.it)('should validate date range parameters', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {
                    investigationId: 'inv-123',
                    timeRange: {
                        start: new Date('2024-01-01'),
                        end: new Date('2024-01-31'),
                    },
                },
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).not.toThrow();
        });
        (0, globals_1.it)('should throw ValidationError for invalid date range', () => {
            const request = (0, test_helpers_js_1.createMockReportRequest)({
                parameters: {
                    investigationId: 'inv-123',
                    timeRange: { start: new Date() }, // Missing 'end'
                },
            });
            (0, globals_1.expect)(() => {
                ReportRequestValidator_js_1.ReportRequestValidator.validate(request, mock_templates_js_1.mockInvestigationSummaryTemplate);
            }).toThrow(ReportRequestValidator_js_1.ValidationError);
        });
    });
});
