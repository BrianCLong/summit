import dotenv from 'dotenv';

export class ConfigLoader {
  static load() {
    dotenv.config();
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  static get(key: string): string {
    return process.env[key] || '';
  }
}
