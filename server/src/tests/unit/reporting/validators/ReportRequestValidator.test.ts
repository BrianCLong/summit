/**
 * Tests for ReportRequestValidator
 */

import { ReportRequestValidator, ValidationError } from '../../../../services/reporting/validators/ReportRequestValidator.js';
import { mockInvestigationSummaryTemplate } from '../../../fixtures/reporting/mock-templates.js';
import { createMockReportRequest } from '../../../fixtures/reporting/test-helpers.js';

describe('ReportRequestValidator', () => {
  describe('validate', () => {
    it('should validate a correct report request', () => {
      const request = createMockReportRequest({
        templateId: 'INVESTIGATION_SUMMARY',
        parameters: {
          investigationId: 'inv-123',
          summaryLevel: 'detailed',
        },
        userId: 'analyst-123',
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).not.toThrow();
    });

    it('should throw ValidationError for missing templateId', () => {
      const request = createMockReportRequest({ templateId: '' });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);

      try {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('templateId');
        expect((error as ValidationError).code).toBe('REQUIRED');
      }
    });

    it('should throw ValidationError for missing userId', () => {
      const request = createMockReportRequest({ userId: '' });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required parameter', () => {
      const request = createMockReportRequest({
        parameters: {}, // Missing investigationId
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);

      try {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      } catch (error) {
        expect((error as ValidationError).field).toBe('investigationId');
        expect((error as ValidationError).message).toContain('investigationId');
      }
    });

    it('should throw ValidationError for invalid enum value', () => {
      const request = createMockReportRequest({
        parameters: {
          investigationId: 'inv-123',
          summaryLevel: 'invalid', // Not in ['brief', 'detailed', 'comprehensive']
        },
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);

      try {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      } catch (error) {
        expect((error as ValidationError).field).toBe('summaryLevel');
        expect((error as ValidationError).code).toBe('INVALID_ENUM');
      }
    });

    it('should throw ValidationError for invalid parameter type', () => {
      const request = createMockReportRequest({
        parameters: {
          investigationId: 123, // Should be string
        },
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);

      try {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_TYPE');
      }
    });

    it('should throw ValidationError for unsupported format', () => {
      const request = createMockReportRequest({
        format: 'INVALID_FORMAT' as any,
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);

      try {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      } catch (error) {
        expect((error as ValidationError).field).toBe('format');
        expect((error as ValidationError).code).toBe('INVALID_FORMAT');
      }
    });

    it('should accept valid enum values', () => {
      for (const level of ['brief', 'detailed', 'comprehensive']) {
        const request = createMockReportRequest({
          parameters: {
            investigationId: 'inv-123',
            summaryLevel: level,
          },
        });

        expect(() => {
          ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
        }).not.toThrow();
      }
    });

    it('should accept valid formats (case insensitive)', () => {
      for (const format of ['PDF', 'pdf', 'DOCX', 'docx', 'HTML', 'html']) {
        const request = createMockReportRequest({
          format: format as any,
        });

        expect(() => {
          ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
        }).not.toThrow();
      }
    });

    it('should handle optional parameters correctly', () => {
      const request = createMockReportRequest({
        parameters: {
          investigationId: 'inv-123',
          // timeRange is optional, not provided
        },
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).not.toThrow();
    });

    it('should validate date range parameters', () => {
      const request = createMockReportRequest({
        parameters: {
          investigationId: 'inv-123',
          timeRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        },
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid date range', () => {
      const request = createMockReportRequest({
        parameters: {
          investigationId: 'inv-123',
          timeRange: { start: new Date() }, // Missing 'end'
        },
      });

      expect(() => {
        ReportRequestValidator.validate(request, mockInvestigationSummaryTemplate);
      }).toThrow(ValidationError);
    });
  });
});
