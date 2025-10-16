/* istanbul ignore file */
import type { MigrationDefinition } from '../types.js';

export const createUsersTable: MigrationDefinition = {
  id: '202401010101-create-users-table',
  title: 'Create users table',
  tags: ['postgres', 'schema'],
  safetyCheck() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be defined before running migrations');
    }
  },
  async up({ logger }) {
    logger.info('Would create the users table');
  },
  async down({ logger }) {
    logger.info('Would drop the users table');
  },
};
