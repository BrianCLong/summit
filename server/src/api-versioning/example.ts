// @ts-nocheck
/**
 * Example usage of the API versioning infrastructure.
 * This file demonstrates common patterns and integration approaches.
 */

import express, { Request, Response } from 'express';
import {
  APIVersion,
  getAPIVersion,
  versionRouter,
  versionNegotiationMiddleware,
  validateAPIVersion,
  deprecationMiddleware,
  VersionedRequest,
  SchemaVersionManager,
} from './index.js';

// ============================================================================
// Example 1: Basic Express App with Versioned Routes
// ============================================================================

export function createVersionedApp() {
  const app = express();

  // Global middleware: automatically detect API version
  app.use(versionNegotiationMiddleware());

  // V1 Router (deprecated)
  const v1Router = versionRouter(APIVersion.V1);

  // Add deprecation headers for v1
  v1Router.use(
    deprecationMiddleware({
      version: APIVersion.V1,
      sunsetDate: new Date('2026-12-31'),
      message: 'API v1 is deprecated. Please migrate to v3 for improved performance and features.',
      migrationGuide: 'https://docs.intelgraph.tech/migration/v1-to-v3',
    })
  );

  // V1 endpoints
  v1Router.get('/users', getUsersV1);
  v1Router.get('/users/:id', getUserByIdV1);
  v1Router.post('/users', createUserV1);

  // V2 Router (supported)
  const v2Router = versionRouter(APIVersion.V2);
  v2Router.get('/users', getUsersV2);
  v2Router.get('/users/:id', getUserByIdV2);
  v2Router.post('/users', createUserV2);

  // V3 Router (current/latest)
  const v3Router = versionRouter(APIVersion.V3);
  v3Router.get('/users', getUsersV3);
  v3Router.get('/users/:id', getUserByIdV3);
  v3Router.post('/users', createUserV3);
  v3Router.patch('/users/:id', updateUserV3); // New in v3

  // Mount versioned routers
  app.use('/api/v1', v1Router);
  app.use('/api/v2', v2Router);
  app.use('/api/v3', v3Router);

  // Fallback: reject unsupported versions
  app.use('/api/*', validateAPIVersion([APIVersion.V2, APIVersion.V3]));

  return app;
}

// ============================================================================
// Example 2: Single Route with Version Branching
// ============================================================================

export function createFlexibleApp() {
  const app = express();

  app.use(versionNegotiationMiddleware());

  // Single endpoint that branches based on version
  app.get('/api/users', (req: Request, res: Response) => {
    const version = (req as VersionedRequest).apiVersion;

    switch (version) {
      case APIVersion.V1:
        return getUsersV1(req, res);
      case APIVersion.V2:
        return getUsersV2(req, res);
      case APIVersion.V3:
        return getUsersV3(req, res);
      default:
        return res.status(406).json({
          error: 'API version not supported',
          requestedVersion: version,
          supportedVersions: [APIVersion.V2, APIVersion.V3],
        });
    }
  });

  return app;
}

// ============================================================================
// Example 3: Schema Diff Analysis (CI/CD or Build-time)
// ============================================================================

export async function runSchemaDiffAnalysis() {
  const manager = new SchemaVersionManager({
    schemaDir: './schemas',
    filePattern: 'openapi-{version}.json',
  });

  try {
    // Load schemas for comparison
    await manager.loadSchema('v2');
    await manager.loadSchema('v3');

    // Compute diff
    const diff = await manager.computeDiff('v2', 'v3');

    // Log report
    console.log(manager.exportDiffReport(diff, 'text'));

    // Check for breaking changes
    if (diff.hasBreakingChanges) {
      console.error('\n⚠️  BREAKING CHANGES DETECTED!\n');
      console.error('Breaking changes:', diff.breakingChanges);

      // In CI/CD, you might want to fail the build
      // process.exit(1);

      return {
        success: false,
        breakingChanges: diff.breakingChanges,
      };
    }

    console.log('\n✅ No breaking changes detected.');
    return {
      success: true,
      diff,
    };
  } catch (error: any) {
    console.error('Schema diff analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 4: In-Memory Schema Testing
// ============================================================================

export async function testSchemaCompatibility() {
  const manager = new SchemaVersionManager();

  // Register in-memory schemas (useful for testing)
  const v1Schema = {
    openapi: '3.1.0',
    paths: {
      '/users': {
        get: {
          parameters: [
            { name: 'limit', in: 'query', required: false },
            { name: 'offset', in: 'query', required: false },
          ],
        },
      },
    },
  };

  const v2Schema = {
    openapi: '3.1.0',
    paths: {
      '/users': {
        get: {
          parameters: [
            { name: 'page', in: 'query', required: false }, // Changed from limit/offset
            { name: 'perPage', in: 'query', required: false },
          ],
        },
      },
      '/users/{id}': {
        // Added in v2
        get: {
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
      },
    },
  };

  manager.registerSchema('v1', v1Schema);
  manager.registerSchema('v2', v2Schema);

  const diff = await manager.computeDiff('v1', 'v2');

  console.log('Added paths:', diff.addedPaths);
  console.log('Modified paths:', diff.modifiedPaths);

  return diff;
}

// ============================================================================
// Mock Handler Functions (Version-Specific Implementations)
// ============================================================================

// V1 Handlers
function getUsersV1(_req: Request, res: Response) {
  res.json({
    version: 'v1',
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ],
  });
}

function getUserByIdV1(req: Request, res: Response) {
  res.json({
    version: 'v1',
    user: { id: req.params.id, name: 'Alice', email: 'alice@example.com' },
  });
}

function createUserV1(req: Request, res: Response) {
  res.status(201).json({
    version: 'v1',
    user: { id: 3, ...req.body },
  });
}

// V2 Handlers
function getUsersV2(_req: Request, res: Response) {
  res.json({
    version: 'v2',
    data: {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: new Date() },
        { id: 2, name: 'Bob', email: 'bob@example.com', createdAt: new Date() },
      ],
    },
    meta: {
      page: 1,
      perPage: 20,
      total: 2,
    },
  });
}

function getUserByIdV2(req: Request, res: Response) {
  res.json({
    version: 'v2',
    data: {
      user: {
        id: req.params.id,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
      },
    },
  });
}

function createUserV2(req: Request, res: Response) {
  res.status(201).json({
    version: 'v2',
    data: {
      user: { id: 3, ...req.body, createdAt: new Date() },
    },
  });
}

// V3 Handlers
function getUsersV3(_req: Request, res: Response) {
  res.json({
    version: 'v3',
    data: {
      users: [
        {
          id: 1,
          name: 'Alice',
          email: 'alice@example.com',
          profile: { avatar: 'https://example.com/avatar1.jpg' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Bob',
          email: 'bob@example.com',
          profile: { avatar: 'https://example.com/avatar2.jpg' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    meta: {
      pagination: {
        page: 1,
        perPage: 20,
        total: 2,
        totalPages: 1,
      },
    },
  });
}

function getUserByIdV3(req: Request, res: Response) {
  res.json({
    version: 'v3',
    data: {
      user: {
        id: req.params.id,
        name: 'Alice',
        email: 'alice@example.com',
        profile: { avatar: 'https://example.com/avatar1.jpg', bio: 'Software Engineer' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  });
}

function createUserV3(req: Request, res: Response) {
  res.status(201).json({
    version: 'v3',
    data: {
      user: {
        id: 3,
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  });
}

function updateUserV3(req: Request, res: Response) {
  res.json({
    version: 'v3',
    data: {
      user: {
        id: req.params.id,
        ...req.body,
        updatedAt: new Date(),
      },
    },
  });
}

// ============================================================================
// Example 5: Custom Version Extraction for Special Cases
// ============================================================================

export function customVersionDetection(req: Request): APIVersion {
  // First try standard detection
  let version = getAPIVersion(req);

  // Custom logic: if user is in beta program, use latest version
  const isBetaUser = req.headers['x-beta-user'] === 'true';
  if (isBetaUser) {
    version = APIVersion.LATEST;
  }

  // Custom logic: if legacy client detected, force v1
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('LegacyClient/1.0')) {
    version = APIVersion.V1;
  }

  return version;
}

// ============================================================================
// Main Execution (for demonstration)
// ============================================================================

if (require.main === module) {
  // Run schema diff analysis
  runSchemaDiffAnalysis()
    .then(() => {
      console.log('Schema analysis complete.');
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });

  // Start versioned app
  const app = createVersionedApp();
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`\n🚀 Versioned API server running on port ${PORT}`);
    console.log(`\nExample requests:`);
    console.log(`  GET http://localhost:${PORT}/api/v1/users`);
    console.log(`  GET http://localhost:${PORT}/api/v2/users`);
    console.log(`  GET http://localhost:${PORT}/api/v3/users`);
    console.log(`\n  curl -H "Accept: application/vnd.intelgraph.v2+json" http://localhost:${PORT}/api/users`);
    console.log(`  curl -H "X-API-Version: v3" http://localhost:${PORT}/api/users`);
  });
}
