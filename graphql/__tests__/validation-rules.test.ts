/**
 * Tests for SchemaValidator
 */

import { buildSchema } from 'graphql';
import { SchemaValidator, validateSchema, ValidationResult } from '../validation-rules';

describe('SchemaValidator', () => {
  describe('validateNamingConventions', () => {
    test('should pass for valid naming', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
          firstName: String
          lastName: String
        }

        type Query {
          user(id: ID!): User
          users: [User!]!
        }
      `);

      const result = validateSchema(schema);

      const namingErrors = result.errors.filter(e => e.rule === 'naming-convention');
      expect(namingErrors.length).toBe(0);
    });

    test('should error on non-PascalCase type names', () => {
      const schema = buildSchema(`
        type userProfile {
          id: ID!
        }

        type Query {
          profile: userProfile
        }
      `);

      const result = validateSchema(schema);

      const namingErrors = result.errors.filter(e => e.rule === 'naming-convention');
      expect(namingErrors.some(e => e.message.includes('userProfile'))).toBe(true);
    });

    test('should error on non-camelCase field names', () => {
      const schema = buildSchema(`
        type User {
          ID: ID!
          FirstName: String
        }

        type Query {
          user: User
        }
      `);

      const result = validateSchema(schema);

      const namingErrors = result.errors.filter(e => e.rule === 'naming-convention');
      expect(namingErrors.length).toBeGreaterThan(0);
    });

    test('should warn for input types not ending with Input', () => {
      const schema = buildSchema(`
        input UserData {
          name: String
        }

        type Query {
          search(data: UserData): String
        }
      `);

      const result = validateSchema(schema);

      const namingWarnings = result.warnings.filter(e => e.rule === 'naming-convention');
      expect(namingWarnings.some(w => w.message.includes('UserData'))).toBe(true);
    });

    test('should pass for input types ending with Input', () => {
      const schema = buildSchema(`
        input CreateUserInput {
          name: String!
        }

        type Mutation {
          createUser(input: CreateUserInput!): String
        }

        type Query {
          dummy: String
        }
      `);

      const result = validateSchema(schema);

      const namingWarnings = result.warnings.filter(
        w => w.rule === 'naming-convention' && w.message.includes('CreateUserInput')
      );
      expect(namingWarnings.length).toBe(0);
    });
  });

  describe('validateDeprecations', () => {
    test('should error on deprecations with short reasons', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
          name: String @deprecated(reason: "Old")
        }

        type Query {
          user: User
        }
      `);

      const result = validateSchema(schema);

      const deprecationErrors = result.errors.filter(e => e.rule === 'deprecation');
      expect(deprecationErrors.length).toBeGreaterThan(0);
      expect(deprecationErrors[0].message).toContain('detailed deprecation reason');
    });

    test('should pass for deprecations with proper reasons', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
          name: String @deprecated(reason: "Use firstName and lastName instead. Will be removed 2025-12-31.")
          firstName: String
          lastName: String
        }

        type Query {
          user: User
        }
      `);

      const result = validateSchema(schema);

      const deprecationErrors = result.errors.filter(e => e.rule === 'deprecation');
      expect(deprecationErrors.length).toBe(0);
    });
  });

  describe('validateAntiPatterns', () => {
    test('should warn on generic field names', () => {
      const schema = buildSchema(`
        type Response {
          data: String
          info: String
        }

        type Query {
          response: Response
        }
      `);

      const result = validateSchema(schema);

      const antiPatternWarnings = result.warnings.filter(w => w.rule === 'anti-pattern');
      expect(antiPatternWarnings.some(w => w.message.includes('generic name'))).toBe(true);
    });

    test('should warn on Query list fields without pagination', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
        }

        type Query {
          users: [User!]!
        }
      `);

      const result = validateSchema(schema);

      const paginationWarnings = result.warnings.filter(
        w => w.rule === 'anti-pattern' && w.message.includes('pagination')
      );
      expect(paginationWarnings.length).toBeGreaterThan(0);
    });

    test('should not warn on Query list fields with pagination', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
        }

        type Query {
          users(limit: Int, offset: Int): [User!]!
        }
      `);

      const result = validateSchema(schema);

      const paginationWarnings = result.warnings.filter(
        w => w.rule === 'anti-pattern' && w.message.includes('users') && w.message.includes('pagination')
      );
      expect(paginationWarnings.length).toBe(0);
    });

    test('should warn on types with too many fields', () => {
      // Create a type with 60 fields
      const fields = Array.from({ length: 60 }, (_, i) => `field${i}: String`).join('\n  ');
      const schema = buildSchema(`
        type LargeType {
          ${fields}
        }

        type Query {
          large: LargeType
        }
      `);

      const result = validateSchema(schema);

      const sizeWarnings = result.warnings.filter(
        w => w.rule === 'anti-pattern' && w.message.includes('60 fields')
      );
      expect(sizeWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFieldComplexity', () => {
    test('should warn on fields with many arguments', () => {
      const args = Array.from({ length: 12 }, (_, i) => `arg${i}: String`).join(', ');
      const schema = buildSchema(`
        type Query {
          search(${args}): String
        }
      `);

      const result = validateSchema(schema);

      const complexityWarnings = result.warnings.filter(w => w.rule === 'complexity');
      expect(complexityWarnings.some(w => w.message.includes('12 arguments'))).toBe(true);
    });
  });

  describe('validateSchema function', () => {
    test('should return valid=true for a good schema', () => {
      const schema = buildSchema(`
        type User {
          id: ID!
          name: String!
        }

        type Query {
          user(id: ID!): User
          users(limit: Int = 10, offset: Int = 0): [User!]!
        }
      `);

      const result = validateSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should return valid=false for a schema with errors', () => {
      const schema = buildSchema(`
        type badType {
          BadField: String
        }

        type Query {
          bad: badType
        }
      `);

      const result = validateSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should skip built-in types', () => {
      const schema = buildSchema(`
        type Query {
          test: String
        }
      `);

      const result = validateSchema(schema);

      // Should not have any errors about __Schema, __Type, etc.
      const builtInErrors = result.errors.filter(e => e.path?.startsWith('__'));
      expect(builtInErrors.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty Query type', () => {
      const schema = buildSchema(`
        type Query {
          _empty: String
        }
      `);

      const result = validateSchema(schema);

      // Should not throw
      expect(result).toBeDefined();
    });

    test('should handle enums correctly', () => {
      const schema = buildSchema(`
        enum Status {
          ACTIVE
          INACTIVE
          PENDING
        }

        type Query {
          status: Status
        }
      `);

      const result = validateSchema(schema);

      // Enums should pass without naming warnings
      const enumWarnings = result.warnings.filter(
        w => w.rule === 'naming-convention' && w.path?.includes('Status')
      );
      expect(enumWarnings.length).toBe(0);
    });

    test('should warn on lowercase enum values', () => {
      const schema = buildSchema(`
        enum Status {
          active
          inactive
        }

        type Query {
          status: Status
        }
      `);

      const result = validateSchema(schema);

      const enumWarnings = result.warnings.filter(
        w => w.rule === 'naming-convention' && w.message.includes('UPPER_CASE')
      );
      expect(enumWarnings.length).toBeGreaterThan(0);
    });

    test('should handle interfaces', () => {
      const schema = buildSchema(`
        interface Node {
          id: ID!
        }

        type User implements Node {
          id: ID!
          name: String
        }

        type Query {
          node(id: ID!): Node
        }
      `);

      const result = validateSchema(schema);

      // Should validate successfully
      expect(result).toBeDefined();
    });
  });
});
