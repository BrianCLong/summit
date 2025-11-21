/**
 * Tests for TemplateValidator
 */

import { TemplateValidator } from '../../../../services/reporting/validators/TemplateValidator.js';
import { ValidationError } from '../../../../services/reporting/validators/ReportRequestValidator.js';

describe('TemplateValidator', () => {
  describe('validateCustomTemplate', () => {
    it('should validate a correct custom template', () => {
      const template = {
        name: 'Custom Investigation Template',
        description: 'Custom template for specific investigation types',
        sections: ['header', 'summary', 'findings'],
        exportFormats: ['pdf', 'docx'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).not.toThrow();
    });

    it('should throw ValidationError for missing name', () => {
      const template = {
        name: '',
        sections: ['header'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('name');
        expect((error as ValidationError).code).toBe('REQUIRED');
      }
    });

    it('should throw ValidationError for name exceeding max length', () => {
      const template = {
        name: 'x'.repeat(201),
        sections: ['header'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('name');
        expect((error as ValidationError).code).toBe('MAX_LENGTH');
      }
    });

    it('should throw ValidationError for empty sections array', () => {
      const template = {
        name: 'Test Template',
        sections: [],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('sections');
        expect((error as ValidationError).code).toBe('REQUIRED');
      }
    });

    it('should throw ValidationError for non-array sections', () => {
      const template = {
        name: 'Test Template',
        sections: 'not-an-array' as any,
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid section names', () => {
      const template = {
        name: 'Test Template',
        sections: ['valid_section', ''],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('sections');
        expect((error as ValidationError).code).toBe('INVALID_FORMAT');
      }
    });

    it('should throw ValidationError for invalid export format', () => {
      const template = {
        name: 'Test Template',
        sections: ['header'],
        exportFormats: ['pdf', 'invalid_format'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('exportFormats');
        expect((error as ValidationError).code).toBe('INVALID_FORMAT');
        expect((error as ValidationError).message).toContain('invalid_format');
      }
    });

    it('should accept all valid export formats', () => {
      const validFormats = ['pdf', 'docx', 'html', 'json', 'csv', 'xlsx', 'pptx', 'gexf'];

      for (const format of validFormats) {
        const template = {
          name: 'Test Template',
          sections: ['header'],
          exportFormats: [format],
        };

        expect(() => {
          TemplateValidator.validateCustomTemplate(template);
        }).not.toThrow();
      }
    });

    it('should throw ValidationError for description exceeding max length', () => {
      const template = {
        name: 'Test Template',
        description: 'x'.repeat(1001),
        sections: ['header'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).toThrow(ValidationError);

      try {
        TemplateValidator.validateCustomTemplate(template);
      } catch (error) {
        expect((error as ValidationError).field).toBe('description');
        expect((error as ValidationError).code).toBe('MAX_LENGTH');
      }
    });

    it('should accept template without exportFormats', () => {
      const template = {
        name: 'Test Template',
        sections: ['header'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).not.toThrow();
    });

    it('should accept template without description', () => {
      const template = {
        name: 'Test Template',
        sections: ['header'],
      };

      expect(() => {
        TemplateValidator.validateCustomTemplate(template);
      }).not.toThrow();
    });
  });

  describe('isValidSectionName', () => {
    it('should accept valid section names', () => {
      const validNames = [
        'executive_summary',
        'key_findings',
        'section_1',
        'my_section',
        'a',
      ];

      for (const name of validNames) {
        expect(TemplateValidator.isValidSectionName(name)).toBe(true);
      }
    });

    it('should reject invalid section names', () => {
      const invalidNames = [
        'Executive Summary', // Spaces
        'section-name', // Hyphens
        '123section', // Starts with number
        'section!', // Special characters
        '', // Empty
        'UPPERCASE', // Uppercase
      ];

      for (const name of invalidNames) {
        expect(TemplateValidator.isValidSectionName(name)).toBe(false);
      }
    });
  });
});
