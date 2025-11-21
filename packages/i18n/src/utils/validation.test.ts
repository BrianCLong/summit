import { describe, it, expect } from 'vitest';
import {
  flattenMessages,
  extractInterpolations,
  validateTranslations,
  findDuplicateTranslations,
  validateICUFormat,
} from './validation';
import type { Messages } from '../types';

describe('flattenMessages', () => {
  it('should flatten nested messages', () => {
    const messages: Messages = {
      common: {
        save: 'Save',
        cancel: 'Cancel',
      },
      auth: {
        login: 'Login',
      },
    };

    const flat = flattenMessages(messages);

    expect(flat).toEqual({
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'auth.login': 'Login',
    });
  });

  it('should handle deeply nested messages', () => {
    const messages: Messages = {
      level1: {
        level2: {
          level3: {
            value: 'Deep value',
          },
        },
      },
    };

    const flat = flattenMessages(messages);

    expect(flat).toEqual({
      'level1.level2.level3.value': 'Deep value',
    });
  });

  it('should handle empty object', () => {
    const flat = flattenMessages({});
    expect(flat).toEqual({});
  });
});

describe('extractInterpolations', () => {
  it('should extract simple interpolation variables', () => {
    const vars = extractInterpolations('Hello {name}!');
    expect(vars).toEqual(['name']);
  });

  it('should extract multiple variables', () => {
    const vars = extractInterpolations('Welcome {name}, you have {count} messages');
    expect(vars).toEqual(['name', 'count']);
  });

  it('should return empty array for no variables', () => {
    const vars = extractInterpolations('No variables here');
    expect(vars).toEqual([]);
  });

  it('should handle duplicate variables', () => {
    const vars = extractInterpolations('{name} said hello to {name}');
    expect(vars).toEqual(['name', 'name']);
  });
});

describe('validateTranslations', () => {
  const baseMessages: Messages = {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      greeting: 'Hello {name}!',
    },
  };

  it('should detect missing keys', () => {
    const targetMessages: Messages = {
      common: {
        save: 'Guardar',
        // missing 'cancel' and 'greeting'
      },
    };

    const result = validateTranslations('en-US', 'es-ES', baseMessages, targetMessages);

    expect(result.missingKeys).toContain('common.cancel');
    expect(result.missingKeys).toContain('common.greeting');
  });

  it('should detect empty values', () => {
    const targetMessages: Messages = {
      common: {
        save: '',
        cancel: 'Cancelar',
        greeting: 'Hola {name}!',
      },
    };

    const result = validateTranslations('en-US', 'es-ES', baseMessages, targetMessages);

    expect(result.emptyValues).toContain('common.save');
  });

  it('should detect invalid interpolations', () => {
    const targetMessages: Messages = {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        greeting: 'Hola!', // missing {name}
      },
    };

    const result = validateTranslations('en-US', 'es-ES', baseMessages, targetMessages);

    expect(result.invalidInterpolations.length).toBeGreaterThan(0);
  });

  it('should calculate coverage correctly', () => {
    const targetMessages: Messages = {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        greeting: 'Hola {name}!',
      },
    };

    const result = validateTranslations('en-US', 'es-ES', baseMessages, targetMessages);

    expect(result.coverage).toBe(100);
  });
});

describe('findDuplicateTranslations', () => {
  it('should find duplicate values', () => {
    const messages: Messages = {
      button1: 'Save',
      button2: 'save', // Same value (case-insensitive)
      button3: 'Cancel',
    };

    const duplicates = findDuplicateTranslations(messages);

    expect(duplicates.size).toBeGreaterThan(0);
    expect(duplicates.get('save')).toEqual(['button1', 'button2']);
  });

  it('should return empty map for unique values', () => {
    const messages: Messages = {
      button1: 'Save',
      button2: 'Cancel',
      button3: 'Delete',
    };

    const duplicates = findDuplicateTranslations(messages);

    expect(duplicates.size).toBe(0);
  });
});

describe('validateICUFormat', () => {
  it('should validate correct ICU format', () => {
    const result = validateICUFormat(
      '{count, plural, one {# item} other {# items}}'
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect unmatched braces', () => {
    const result = validateICUFormat('Hello {name');

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect missing other in plural', () => {
    const result = validateICUFormat(
      '{count, plural, one {# item}}'
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('missing required \'other\' case')
    );
  });

  it('should validate simple interpolation', () => {
    const result = validateICUFormat('Hello {name}!');

    expect(result.valid).toBe(true);
  });
});
