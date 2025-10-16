#!/usr/bin/env node

import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import argon2 from 'argon2';

const { Pool } = pkg;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://maestro:maestro-dev-secret@localhost:5432/maestro';

const pool = new Pool({ connectionString: DATABASE_URL });

async function seedUsers() {
  console.log('Seeding users with RBAC roles...');

  try {
    // Create users table if it doesn't exist (for testing)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'VIEWER',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Users table ready');

    // Create default users for testing
    const users = [
      {
        email: 'admin@maestro.dev',
        username: 'admin',
        password: 'admin123',
        first_name: 'System',
        last_name: 'Administrator',
        role: 'ADMIN',
      },
      {
        email: 'analyst@maestro.dev',
        username: 'analyst',
        password: 'analyst123',
        first_name: 'Data',
        last_name: 'Analyst',
        role: 'ANALYST',
      },
      {
        email: 'operator@maestro.dev',
        username: 'operator',
        password: 'operator123',
        first_name: 'Pipeline',
        last_name: 'Operator',
        role: 'OPERATOR',
      },
      {
        email: 'viewer@maestro.dev',
        username: 'viewer',
        password: 'viewer123',
        first_name: 'Read-Only',
        last_name: 'Viewer',
        role: 'VIEWER',
      },
    ];

    for (const userData of users) {
      // Hash password
      const passwordHash = await argon2.hash(userData.password);

      // Insert user (on conflict do nothing to avoid duplicates)
      await pool.query(
        `
        INSERT INTO users (email, username, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `,
        [
          userData.email,
          userData.username,
          passwordHash,
          userData.first_name,
          userData.last_name,
          userData.role,
        ],
      );

      console.log(`Created user: ${userData.email} (${userData.role})`);
    }

    console.log('');
    console.log('RBAC Users created successfully!');
    console.log('');
    console.log('Test credentials:');
    console.log('  Admin:    admin@maestro.dev / admin123');
    console.log('  Analyst:  analyst@maestro.dev / analyst123');
    console.log('  Operator: operator@maestro.dev / operator123');
    console.log('  Viewer:   viewer@maestro.dev / viewer123');
    console.log('');
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
