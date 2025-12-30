import { MigrationContext } from './types.js';

export class ValidationService {
  async validateRecord(ctx: MigrationContext, record: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation logic
    if (!record) {
      errors.push('Record is null or undefined');
      return { valid: false, errors };
    }

    // Example check: ID existence
    if (!record.id && !record.Id && !record.ID) {
      errors.push('Missing unique identifier (id)');
    }

    // Example check: Email format (if email field exists)
    if (record.email && typeof record.email === 'string') {
      if (!record.email.includes('@')) {
        errors.push('Invalid email format');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateMappings(ctx: MigrationContext): Promise<{ valid: boolean; errors: string[] }> {
    // Check if mappings are valid
    return { valid: true, errors: [] };
  }
}
