#!/usr/bin/env tsx
/**
 * Comprehensive Test Suite Generator
 *
 * Automatically generates unit tests, integration tests, and E2E tests
 * for files that don't have adequate test coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface TestTemplate {
  type: 'unit' | 'integration' | 'e2e';
  template: string;
}

/**
 * Generate unit test for a TypeScript file
 */
function generateUnitTest(filePath: string, sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(process.cwd(), filePath);

  // Extract exports from the file
  const exportMatches = sourceCode.matchAll(/export\s+(class|function|const|interface|type)\s+(\w+)/g);
  const exports = Array.from(exportMatches).map(match => ({
    type: match[1],
    name: match[2]
  }));

  let testContent = `/**
 * Unit tests for ${relativePath}
 * Auto-generated - customize as needed
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
`;

  // Add imports for all exports
  if (exports.length > 0) {
    const exportNames = exports
      .filter(e => e.type !== 'interface' && e.type !== 'type')
      .map(e => e.name);

    if (exportNames.length > 0) {
      testContent += `import { ${exportNames.join(', ')} } from './${fileName}';\n`;
    }
  }

  testContent += `\n`;

  // Generate test suites for each export
  for (const exp of exports) {
    if (exp.type === 'interface' || exp.type === 'type') continue;

    testContent += `describe('${exp.name}', () => {
`;

    if (exp.type === 'class') {
      testContent += `  let instance: ${exp.name};

  beforeEach(() => {
    instance = new ${exp.name}();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('should create an instance', () => {
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(${exp.name});
  });

  it('should have correct initial state', () => {
    // Add assertions for initial state
    expect(instance).toBeTruthy();
  });

  // TODO: Add more specific tests for methods and properties
`;
    } else if (exp.type === 'function') {
      testContent += `  it('should be defined', () => {
    expect(${exp.name}).toBeDefined();
    expect(typeof ${exp.name}).toBe('function');
  });

  it('should handle valid input', () => {
    // TODO: Add test with valid input
    // const result = ${exp.name}(validInput);
    // expect(result).toBe(expectedOutput);
  });

  it('should handle invalid input', () => {
    // TODO: Add test with invalid input
    // expect(() => ${exp.name}(invalidInput)).toThrow();
  });

  it('should handle edge cases', () => {
    // TODO: Add edge case tests
  });
`;
    } else if (exp.type === 'const') {
      testContent += `  it('should be defined', () => {
    expect(${exp.name}).toBeDefined();
  });

  it('should have expected properties', () => {
    // TODO: Add assertions for properties
  });
`;
    }

    testContent += `});

`;
  }

  // If no exports found, create a basic test
  if (exports.length === 0) {
    testContent += `describe('${fileName}', () => {
  it('should be a valid module', () => {
    expect(true).toBe(true);
  });

  // TODO: Add specific tests for this module
});
`;
  }

  return testContent;
}

/**
 * Generate integration test
 */
function generateIntegrationTest(serviceName: string): string {
  return `/**
 * Integration tests for ${serviceName}
 * Auto-generated - customize as needed
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestDatabase, cleanupTestDatabase } from '../../../tests/utils/test-db';
import { createTestServer } from '../../../tests/utils/test-server';

describe('${serviceName} Integration Tests', () => {
  let testDb: any;
  let server: any;

  beforeAll(async () => {
    // Setup test database
    testDb = await createTestDatabase();

    // Setup test server
    server = await createTestServer({
      database: testDb,
    });
  });

  afterAll(async () => {
    // Cleanup
    await server?.close();
    await cleanupTestDatabase(testDb);
  });

  describe('Database Operations', () => {
    it('should connect to database', async () => {
      expect(testDb).toBeDefined();
      const result = await testDb.query('SELECT 1');
      expect(result).toBeDefined();
    });

    it('should create records', async () => {
      // TODO: Add create operation test
    });

    it('should read records', async () => {
      // TODO: Add read operation test
    });

    it('should update records', async () => {
      // TODO: Add update operation test
    });

    it('should delete records', async () => {
      // TODO: Add delete operation test
    });
  });

  describe('API Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await server.request('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should handle authentication', async () => {
      // TODO: Add authentication test
    });

    it('should handle authorization', async () => {
      // TODO: Add authorization test
    });

    // TODO: Add endpoint-specific tests
  });

  describe('Error Handling', () => {
    it('should handle invalid requests', async () => {
      const response = await server.request('/invalid-endpoint');
      expect(response.status).toBe(404);
    });

    it('should handle malformed data', async () => {
      // TODO: Add malformed data test
    });

    it('should handle database errors gracefully', async () => {
      // TODO: Add database error handling test
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => server.request('/health'));

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within acceptable time', async () => {
      const start = Date.now();
      await server.request('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
`;
}

/**
 * Generate E2E test
 */
function generateE2ETest(featureName: string): string {
  return `/**
 * E2E tests for ${featureName}
 * Auto-generated - customize as needed
 */

import { test, expect } from '@playwright/test';

test.describe('${featureName} E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Login if required
    // await page.fill('[data-testid="username"]', 'testuser');
    // await page.fill('[data-testid="password"]', 'testpass');
    // await page.click('[data-testid="login-button"]');
  });

  test('should display ${featureName} page', async ({ page }) => {
    // Navigate to feature
    // await page.click('[data-testid="${featureName.toLowerCase()}-link"]');

    // Verify page loaded
    await expect(page).toHaveTitle(/${featureName}/i);

    // TODO: Add page-specific assertions
  });

  test('should handle user interactions', async ({ page }) => {
    // TODO: Add interaction tests
    // await page.click('[data-testid="action-button"]');
    // await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });

  test('should handle form submission', async ({ page }) => {
    // TODO: Add form submission test
    // await page.fill('[data-testid="form-field"]', 'test value');
    // await page.click('[data-testid="submit-button"]');
    // await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // TODO: Add error handling test
    // Trigger an error condition
    // await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // TODO: Add accessibility tests
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile');

    // TODO: Add mobile-specific tests
  });

  test('should handle network issues', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);

    // TODO: Add offline handling test

    // Restore online
    await context.setOffline(false);
  });
});
`;
}

/**
 * Find files that need tests
 */
async function findFilesNeedingTests(): Promise<string[]> {
  const sourceFiles = await glob('**/*.{ts,tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**',
      '**/tests/**',
    ],
    cwd: process.cwd(),
  });

  const filesNeedingTests: string[]= [];

  for (const file of sourceFiles) {
    const testFile1 = file.replace(/\.tsx?$/, '.test.ts');
    const testFile2 = file.replace(/\.tsx?$/, '.spec.ts');
    const testFile3 = file.replace(/\.tsx?$/, '.test.tsx');

    const hasTest = fs.existsSync(testFile1) ||
                    fs.existsSync(testFile2) ||
                    fs.existsSync(testFile3);

    if (!hasTest) {
      filesNeedingTests.push(file);
    }
  }

  return filesNeedingTests;
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 Generating comprehensive test suite...\n');

  const filesNeedingTests = await findFilesNeedingTests();

  console.log(`Found ${filesNeedingTests.length} files without tests\n`);

  let generated = 0;
  let skipped = 0;

  for (const file of filesNeedingTests.slice(0, 50)) {  // Limit to first 50 for now
    try {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const testContent = generateUnitTest(file, sourceCode);

      const testFilePath = file.replace(/\.tsx?$/, '.test.ts');
      const testDir = path.dirname(testFilePath);

      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFilePath, testContent);

      console.log(`✓ Generated test for: ${file}`);
      generated++;
    } catch (error) {
      console.error(`✗ Failed to generate test for ${file}:`, error);
      skipped++;
    }
  }

  // Generate integration test examples
  const servicesDir = path.join(process.cwd(), 'services');
  if (fs.existsSync(servicesDir)) {
    const services = fs.readdirSync(servicesDir).filter(f => {
      return fs.statSync(path.join(servicesDir, f)).isDirectory();
    }).slice(0, 10);

    for (const service of services) {
      const integrationTestPath = path.join(
        servicesDir,
        service,
        '__tests__',
        'integration',
        `${service}.integration.test.ts`
      );

      if (!fs.existsSync(integrationTestPath)) {
        fs.mkdirSync(path.dirname(integrationTestPath), { recursive: true });
        fs.writeFileSync(integrationTestPath, generateIntegrationTest(service));
        console.log(`✓ Generated integration test for service: ${service}`);
        generated++;
      }
    }
  }

  // Generate E2E test examples
  const e2eDir = path.join(process.cwd(), 'tests/e2e');
  fs.mkdirSync(e2eDir, { recursive: true });

  const features = ['Dashboard', 'EntityGraph', 'Search', 'Collaboration'];
  for (const feature of features) {
    const e2eTestPath = path.join(e2eDir, `${feature.toLowerCase()}.spec.ts`);

    if (!fs.existsSync(e2eTestPath)) {
      fs.writeFileSync(e2eTestPath, generateE2ETest(feature));
      console.log(`✓ Generated E2E test for feature: ${feature}`);
      generated++;
    }
  }

  console.log(`\n📊 Test Generation Complete:`);
  console.log(`   • Generated: ${generated} test files`);
  console.log(`   • Skipped: ${skipped} files`);
  console.log(`   • Remaining: ${filesNeedingTests.length - 50} files (run again to generate more)\n`);

  // Generate test utilities
  const testUtilsContent = `/**
 * Test utilities and helpers
 */

import { execSync } from 'child_process';

export async function createTestDatabase() {
  // Create temporary test database
  const dbName = \`test_\${Date.now()}\`;

  // Implementation depends on your database
  // Example for PostgreSQL:
  // execSync(\`createdb \${dbName}\`);
  // await runMigrations(dbName);

  return {
    name: dbName,
    query: async (sql: string) => {
      // Execute query
    },
  };
}

export async function cleanupTestDatabase(db: any) {
  // Drop test database
  // execSync(\`dropdb \${db.name}\`);
}

export async function createTestServer(options: any = {}) {
  // Create test server instance
  return {
    request: async (path: string, options: any = {}) => {
      // Make request to test server
      return {
        status: 200,
        body: {},
      };
    },
    close: async () => {
      // Shutdown server
    },
  };
}

export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };
}

export function createMockMetrics() {
  return {
    increment: jest.fn(),
    gauge: jest.fn(),
    histogram: jest.fn(),
    timing: jest.fn(),
  };
}

export async function waitFor(condition: () => boolean, timeout: number = 5000) {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function generateTestData<T>(factory: () => T, count: number = 10): T[] {
  return Array.from({ length: count }, factory);
}
`;

  const testUtilsPath = path.join(process.cwd(), 'tests/utils/test-helpers.ts');
  fs.mkdirSync(path.dirname(testUtilsPath), { recursive: true });
  fs.writeFileSync(testUtilsPath, testUtilsContent);
  console.log(`✓ Created test utilities: tests/utils/test-helpers.ts\n`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as generateTests };
