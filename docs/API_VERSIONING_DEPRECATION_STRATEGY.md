# API Versioning & Deprecation Strategy

**API Name:** Summit Intelligence Analysis Platform
**Type:** Internal API (with potential for partner/external access)
**Tech Stack:** REST (Express.js) + GraphQL (Apollo Server)
**Framework:** Express v5.1.0, Apollo Server v5.1.0, TypeScript v5.9.3

---

## Current Problems

1. **Inconsistent versioning** - Some endpoints use `/v1/` prefix (Maestro, Conductor), others are unversioned (admin, export, AI routes)
2. **Zombie endpoints persist** - Deprecated endpoints documented but still live without removal timeline
3. **No deprecation metadata** - Missing Sunset headers, deprecation warnings, and formal notice periods
4. **Parallel implementations without migration path** - Router v2 exists alongside old router with no clear cutover plan
5. **Client-side version unawareness** - Frontend clients have no mechanism to detect or handle API versioning

---

## Section 1: Recommended Versioning Strategy

### Strategy: **Hybrid URL + Header-Based Versioning**

We recommend a **dual-versioning approach** optimized for our internal API with future external partner support:

#### **For REST APIs:**
- **URL path versioning** (`/api/{service}/v{N}/`) for **major versions**
- **Header-based versioning** (`API-Version: v2.1`) for **minor/patch versions**
- **Sunset headers** for deprecation warnings

#### **For GraphQL API:**
- **Schema evolution** (additive-only changes, no versioning in URL)
- **Field deprecation directives** with `@deprecated` annotations
- **API-Version header** for breaking schema changes (use sparingly)

#### Why This Approach?

| Factor | URL Versioning | Header Versioning | Our Hybrid Approach |
|--------|---------------|-------------------|---------------------|
| **Discoverability** | ✅ Visible in browser/logs | ❌ Hidden in headers | ✅ Major versions visible |
| **Caching** | ✅ Cache-friendly | ⚠️ Requires Vary header | ✅ Major versions cached separately |
| **Migration** | ⚠️ Clients must update URLs | ✅ Gradual rollout | ✅ Flexible migration paths |
| **Internal APIs** | ✅ Clear contracts | ✅ Faster iteration | ✅ Best of both |
| **GraphQL** | ❌ Anti-pattern | ✅ Native support | ✅ Schema evolution |

### Version Number Semantics

Follow **Semantic Versioning (SemVer)**:

- **Major (v1 → v2)**: Breaking changes (remove fields, change types, alter behavior)
  - **Action**: New URL path `/api/service/v2/`
  - **Timeline**: 6-month deprecation period for v1

- **Minor (v2.0 → v2.1)**: Additive changes (new fields, new endpoints)
  - **Action**: Header `API-Version: v2.1` (optional)
  - **Timeline**: No deprecation needed

- **Patch (v2.1.0 → v2.1.1)**: Bug fixes, no API contract changes
  - **Action**: No version change required
  - **Timeline**: Immediate deployment

---

## Section 2: Deprecation Policy

### Deprecation Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   ACTIVE    │ => │  DEPRECATED  │ => │  SUNSET     │ => │   REMOVED    │
│             │    │              │    │             │    │              │
│ Full support│    │ Still works  │    │ Last chance │    │ Returns 410  │
│             │    │ + warnings   │    │ + loud warn │    │ Gone Forever │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
     Now            T + 0 months        T + 5 months       T + 6 months
```

### Timelines by Change Type

| Change Type | Notice Period | Sunset Period | Total Lifecycle | Example |
|-------------|---------------|---------------|-----------------|---------|
| **Major breaking** | 6 months | 1 month | 7 months | Remove endpoint |
| **Minor breaking** | 3 months | 1 month | 4 months | Change response format |
| **Field removal** | 3 months | 1 month | 4 months | Delete `user.legacyId` |
| **Behavior change** | 2 months | 2 weeks | ~2.5 months | Change sort order |

### Deprecation Checklist

When deprecating an API version or endpoint:

- [ ] **Month 0 (Announcement)**
  - [ ] Add `Deprecated: true` to OpenAPI spec
  - [ ] Add `Deprecation` and `Sunset` headers to responses
  - [ ] Update GraphQL schema with `@deprecated` directives
  - [ ] Log deprecation warnings in server logs
  - [ ] Send stakeholder email announcement

- [ ] **Month 1 (Documentation)**
  - [ ] Publish migration guide with code examples
  - [ ] Update API documentation with deprecation badges
  - [ ] Create Slack channel for migration support
  - [ ] Add deprecation warnings to client SDK

- [ ] **Month 3 (Active Migration)**
  - [ ] Track usage metrics (which clients still use deprecated version)
  - [ ] Send personalized migration reminders to heavy users
  - [ ] Increase deprecation warning log levels (INFO → WARN)

- [ ] **Month 5 (Sunset Warning)**
  - [ ] Add `Link: <new-endpoint>; rel="successor-version"` headers
  - [ ] Return 299 "Miscellaneous Persistent Warning" status
  - [ ] Send final migration deadline email
  - [ ] Increase log levels (WARN → ERROR)

- [ ] **Month 6 (Removal)**
  - [ ] Change response to 410 Gone with migration instructions
  - [ ] Archive endpoint code (don't delete, move to `deprecated/` folder)
  - [ ] Update metrics dashboards to track 410 responses
  - [ ] Send post-mortem report to stakeholders

### Required Headers & Metadata

#### HTTP Response Headers

```http
# For deprecated endpoints
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </api/service/v2/endpoint>; rel="successor-version"
Warning: 299 - "This endpoint is deprecated and will be removed on 2025-12-31. Migrate to /api/service/v2/endpoint"

# For sunset period (last month)
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </api/service/v2/endpoint>; rel="successor-version"
Warning: 299 - "⚠️  URGENT: This endpoint will be removed in 30 days. Migrate immediately to /api/service/v2/endpoint"
```

#### GraphQL Schema Annotations

```graphql
type User {
  id: ID!
  name: String!
  legacyId: String @deprecated(reason: "Use 'id' instead. Removed after 2025-12-31")
  username: String @deprecated(reason: "Migrated to 'name'. See migration guide: https://docs.internal/migrations/username-to-name")
}

type Query {
  user(id: ID!): User
  getUser(legacyId: String!): User @deprecated(reason: "Use 'user(id)' query instead")
}
```

#### OpenAPI Specification

```yaml
paths:
  /api/maestro/v1/runs/deprecated-endpoint:
    get:
      operationId: getDeprecatedRuns
      deprecated: true
      x-sunset-date: "2025-12-31T23:59:59Z"
      x-successor-endpoint: "/api/maestro/v2/runs"
      description: |
        **⚠️ DEPRECATED**: This endpoint is deprecated and will be removed on 2025-12-31.

        **Migration Path**: Use `/api/maestro/v2/runs` instead.

        **Breaking Changes**:
        - Response format changed from array to paginated object
        - `status` field renamed to `state`

        See [Migration Guide](https://docs.internal/migrations/runs-v2)
      responses:
        '200':
          description: Success (deprecated)
          headers:
            Deprecation:
              schema:
                type: string
                example: "true"
            Sunset:
              schema:
                type: string
                example: "Sat, 31 Dec 2025 23:59:59 GMT"
```

### Communication Cadence

| Milestone | Channel | Audience | Template |
|-----------|---------|----------|----------|
| **T+0: Announcement** | Email + Slack + API docs | All API consumers | "Deprecation Notice" |
| **T+2 weeks** | Slack reminder | All API consumers | "Migration Resources Available" |
| **T+1 month** | Email | High-usage clients | "Priority Migration Support" |
| **T+3 months** | Email + Slack | Active deprecated users | "Halfway Point Reminder" |
| **T+5 months** | Email (urgent) | Still-active users | "30-Day Final Warning" |
| **T+1 week** | Email (critical) | Still-active users | "7-Day Emergency Notice" |
| **T+6 months** | Email | All | "Deprecation Completed" |

---

## Section 3: Code Examples

### Example 1: Versioning Middleware

**File:** `/server/src/middleware/api-version.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export interface VersionedRequest extends Request {
  apiVersion: {
    major: number;
    minor: number;
    patch: number;
    raw: string;
  };
}

/**
 * API versioning middleware
 * Extracts version from URL path (/api/service/v2/) or API-Version header
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const versionedReq = req as VersionedRequest;

  // 1. Check URL path for major version (e.g., /api/maestro/v2/)
  const pathVersionMatch = req.path.match(/\/v(\d+)\//);

  // 2. Check API-Version header for full version (e.g., "v2.1.0")
  const headerVersion = req.headers['api-version'] as string;

  let version = { major: 1, minor: 0, patch: 0, raw: 'v1.0.0' };

  if (pathVersionMatch) {
    version.major = parseInt(pathVersionMatch[1], 10);
    version.raw = `v${version.major}.0.0`;
  }

  if (headerVersion) {
    const parsed = parseVersion(headerVersion);
    if (parsed) {
      version = parsed;
    }
  }

  versionedReq.apiVersion = version;

  // Set response header to indicate which version is being used
  res.setHeader('API-Version', version.raw);

  logger.debug({
    path: req.path,
    requestedVersion: version.raw,
    method: req.method
  }, 'API version resolved');

  next();
}

function parseVersion(versionStr: string): { major: number; minor: number; patch: number; raw: string } | null {
  const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: `v${match[1]}.${match[2]}.${match[3]}`
  };
}

/**
 * Version guard middleware - ensures minimum version
 */
export function requireVersion(minVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const versionedReq = req as VersionedRequest;
    const required = parseVersion(minVersion);

    if (!required) {
      return res.status(500).json({ error: 'Invalid version configuration' });
    }

    const current = versionedReq.apiVersion;

    if (current.major < required.major ||
        (current.major === required.major && current.minor < required.minor) ||
        (current.major === required.major && current.minor === required.minor && current.patch < required.patch)) {
      return res.status(400).json({
        error: 'API version too old',
        required: minVersion,
        provided: current.raw,
        message: `This endpoint requires API version ${minVersion} or higher. You provided ${current.raw}.`
      });
    }

    next();
  };
}
```

---

### Example 2: Deprecation Middleware

**File:** `/server/src/middleware/deprecation.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export interface DeprecationConfig {
  /** Date when the endpoint will be removed (ISO 8601) */
  sunsetDate: string;
  /** Link to successor endpoint or migration guide */
  successorUrl?: string;
  /** Custom deprecation message */
  message?: string;
  /** Whether to log each request (default: true) */
  logRequests?: boolean;
}

/**
 * Marks an endpoint as deprecated and adds appropriate headers
 */
export function deprecated(config: DeprecationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sunsetDate = new Date(config.sunsetDate);
    const now = new Date();
    const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Add deprecation headers
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate.toUTCString());

    if (config.successorUrl) {
      res.setHeader('Link', `<${config.successorUrl}>; rel="successor-version"`);
    }

    // Construct warning message
    let warningMessage = config.message || `This endpoint is deprecated and will be removed on ${sunsetDate.toISOString().split('T')[0]}.`;

    if (config.successorUrl) {
      warningMessage += ` Migrate to ${config.successorUrl}`;
    }

    // Escalate warning urgency as sunset approaches
    if (daysUntilSunset <= 7) {
      warningMessage = `⚠️ URGENT (${daysUntilSunset} days left): ${warningMessage}`;
    } else if (daysUntilSunset <= 30) {
      warningMessage = `⚠️ WARNING (${daysUntilSunset} days left): ${warningMessage}`;
    }

    res.setHeader('Warning', `299 - "${warningMessage}"`);

    // Log deprecation usage
    if (config.logRequests !== false) {
      const logLevel = daysUntilSunset <= 7 ? 'error' : daysUntilSunset <= 30 ? 'warn' : 'info';

      logger[logLevel]({
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        daysUntilSunset,
        sunsetDate: config.sunsetDate,
        userId: (req as any).user?.id
      }, `Deprecated endpoint accessed: ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Returns 410 Gone for sunset endpoints
 */
export function sunset(config: { successorUrl?: string; message?: string }) {
  return (req: Request, res: Response) => {
    logger.error({
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id
    }, 'Sunset endpoint accessed');

    return res.status(410).json({
      error: 'Gone',
      message: config.message || 'This endpoint has been removed.',
      successorUrl: config.successorUrl,
      documentation: 'https://docs.internal/api/deprecations'
    });
  };
}
```

---

### Example 3: Running v1 and v2 Side-by-Side (REST)

**File:** `/server/src/routes/maestro/runs-v1.ts`

```typescript
import { Router } from 'express';
import { deprecated } from '../../middleware/deprecation';
import { RunsService } from '../../maestro/runs/RunsService';
import { logger } from '../../lib/logger';

const router = Router();
const runsService = new RunsService();

/**
 * V1 Runs Endpoint - DEPRECATED
 * Returns flat array of runs (old format)
 */
router.get(
  '/runs',
  deprecated({
    sunsetDate: '2025-12-31T23:59:59Z',
    successorUrl: '/api/maestro/v2/runs',
    message: 'Use v2 for paginated results and improved performance.'
  }),
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;

      // Old v1 behavior: return all runs as flat array
      const runs = await runsService.listRuns({
        tenantId,
        limit: 1000 // v1 had no pagination, return max 1000
      });

      // V1 response format (flat array)
      const v1Runs = runs.map(run => ({
        id: run.id,
        status: run.state, // v1 used "status" field
        pipeline: run.pipelineId,
        created: run.createdAt,
        completed: run.completedAt,
        owner: run.userId
      }));

      logger.warn({
        tenantId,
        userId: (req as any).user?.id,
        count: v1Runs.length
      }, 'V1 runs endpoint accessed (deprecated)');

      return res.json(v1Runs);

    } catch (error) {
      logger.error({ error }, 'Error fetching v1 runs');
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

**File:** `/server/src/routes/maestro/runs-v2.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { RunsService } from '../../maestro/runs/RunsService';
import { logger } from '../../lib/logger';

const router = Router();
const runsService = new RunsService();

// V2 query schema with validation
const ListRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  state: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  pipelineId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'completedAt', 'state']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * V2 Runs Endpoint - CURRENT
 * Returns paginated runs with filtering and sorting
 */
router.get('/runs', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    // Parse and validate query params
    const queryResult = ListRunsQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.format()
      });
    }

    const { page, pageSize, state, pipelineId, sortBy, sortOrder } = queryResult.data;

    // V2 behavior: paginated results
    const result = await runsService.listRunsPaginated({
      tenantId,
      page,
      pageSize,
      filters: {
        state,
        pipelineId
      },
      sort: {
        field: sortBy,
        order: sortOrder
      }
    });

    // V2 response format (paginated with metadata)
    return res.json({
      data: result.runs.map(run => ({
        id: run.id,
        state: run.state, // v2 uses "state" field
        pipelineId: run.pipelineId,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        userId: run.userId,
        duration: run.duration,
        metadata: run.metadata
      })),
      pagination: {
        page,
        pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / pageSize),
        hasNextPage: page * pageSize < result.total,
        hasPreviousPage: page > 1
      },
      links: {
        self: `/api/maestro/v2/runs?page=${page}&pageSize=${pageSize}`,
        next: page * pageSize < result.total
          ? `/api/maestro/v2/runs?page=${page + 1}&pageSize=${pageSize}`
          : null,
        previous: page > 1
          ? `/api/maestro/v2/runs?page=${page - 1}&pageSize=${pageSize}`
          : null
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error fetching v2 runs');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

**File:** `/server/src/routes/maestro/index.ts` (Route mounting)

```typescript
import { Router } from 'express';
import { apiVersionMiddleware } from '../../middleware/api-version';
import runsV1Router from './runs-v1';
import runsV2Router from './runs-v2';

const router = Router();

// Apply version middleware to all Maestro routes
router.use(apiVersionMiddleware);

// Mount v1 routes (deprecated)
router.use('/api/maestro/v1', runsV1Router);

// Mount v2 routes (current)
router.use('/api/maestro/v2', runsV2Router);

export default router;
```

---

### Example 4: GraphQL Schema Evolution with Deprecation

**File:** `/server/src/graphql/schema.ts`

```graphql
type Run {
  id: ID!

  # V2: Renamed from "status" to "state" for consistency
  state: RunState!

  # V1: Deprecated field
  status: String @deprecated(
    reason: "Use 'state' field instead. 'status' will be removed after 2025-12-31. See https://docs.internal/migrations/run-state"
  )

  pipelineId: ID!
  pipeline: Pipeline

  userId: ID!
  user: User

  createdAt: DateTime!
  completedAt: DateTime

  # V2: New field
  duration: Int

  # V2: New field
  metadata: JSON
}

enum RunState {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

type Query {
  # V2: Current query with pagination
  runs(
    page: Int = 1
    pageSize: Int = 20
    state: RunState
    pipelineId: ID
  ): RunsConnection!

  # V1: Deprecated query (returns all runs)
  allRuns: [Run!]! @deprecated(
    reason: "Use 'runs' query with pagination instead. This query returns max 1000 results and will be removed after 2025-12-31."
  )

  run(id: ID!): Run
}

type RunsConnection {
  edges: [RunEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type RunEdge {
  node: Run!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

**File:** `/server/src/graphql/resolvers/run-resolvers.ts`

```typescript
import { GraphQLFieldResolver } from 'graphql';
import { logger } from '../../lib/logger';
import { RunsService } from '../../maestro/runs/RunsService';

const runsService = new RunsService();

export const runResolvers = {
  Query: {
    // V2: Current paginated query
    runs: async (_parent, args, context) => {
      const { page = 1, pageSize = 20, state, pipelineId } = args;
      const { tenantId, user } = context;

      const result = await runsService.listRunsPaginated({
        tenantId,
        page,
        pageSize,
        filters: { state, pipelineId }
      });

      return {
        edges: result.runs.map(run => ({
          node: run,
          cursor: Buffer.from(`run:${run.id}`).toString('base64')
        })),
        pageInfo: {
          hasNextPage: page * pageSize < result.total,
          hasPreviousPage: page > 1,
          startCursor: result.runs.length > 0
            ? Buffer.from(`run:${result.runs[0].id}`).toString('base64')
            : null,
          endCursor: result.runs.length > 0
            ? Buffer.from(`run:${result.runs[result.runs.length - 1].id}`).toString('base64')
            : null
        },
        totalCount: result.total
      };
    },

    // V1: Deprecated non-paginated query
    allRuns: async (_parent, _args, context) => {
      const { tenantId, user } = context;

      // Log usage of deprecated query
      logger.warn({
        userId: user?.id,
        tenantId,
        query: 'allRuns'
      }, 'Deprecated GraphQL query "allRuns" used. Migrate to "runs" with pagination.');

      const runs = await runsService.listRuns({
        tenantId,
        limit: 1000
      });

      return runs;
    },

    run: async (_parent, { id }, context) => {
      const { tenantId } = context;
      return await runsService.getRun(id, tenantId);
    }
  },

  Run: {
    // V2: Current field
    state: (parent) => parent.state,

    // V1: Deprecated field (map state -> status for backward compat)
    status: (parent) => {
      // Log usage of deprecated field
      logger.info({
        runId: parent.id,
        field: 'status'
      }, 'Deprecated field "Run.status" accessed. Use "Run.state" instead.');

      // Map new state values to old status values
      const stateToStatusMap: Record<string, string> = {
        'PENDING': 'pending',
        'RUNNING': 'active',
        'COMPLETED': 'done',
        'FAILED': 'error'
      };

      return stateToStatusMap[parent.state] || parent.state.toLowerCase();
    },

    pipeline: async (parent, _args, context) => {
      const { loaders } = context;
      return await loaders.pipelineLoader.load(parent.pipelineId);
    },

    user: async (parent, _args, context) => {
      const { loaders } = context;
      return await loaders.userLoader.load(parent.userId);
    },

    duration: (parent) => {
      if (!parent.completedAt) return null;
      return parent.completedAt.getTime() - parent.createdAt.getTime();
    }
  }
};
```

---

### Example 5: Apollo Server Plugin for Deprecation Tracking

**File:** `/server/src/graphql/plugins/deprecation-plugin.ts`

```typescript
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { getDeprecatedFields } from '../utils/schema-introspection';
import { logger } from '../../lib/logger';

export interface DeprecationPluginConfig {
  /** Log deprecated field usage (default: true) */
  logUsage?: boolean;
  /** Track metrics for deprecated field usage (default: true) */
  trackMetrics?: boolean;
}

/**
 * Apollo plugin to track and log deprecated field usage
 */
export function deprecationTrackingPlugin(
  config: DeprecationPluginConfig = {}
): ApolloServerPlugin {
  const { logUsage = true, trackMetrics = true } = config;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async willSendResponse({ request, response, contextValue }) {
          if (!request.query) return;

          // Extract deprecated fields from the query
          const deprecatedFields = getDeprecatedFields(
            request.query,
            contextValue.schema
          );

          if (deprecatedFields.length === 0) return;

          // Log deprecated field usage
          if (logUsage) {
            logger.warn({
              userId: contextValue.user?.id,
              tenantId: contextValue.tenantId,
              operationName: request.operationName,
              deprecatedFields: deprecatedFields.map(f => f.path),
              query: request.query
            }, 'GraphQL query uses deprecated fields');
          }

          // Add deprecation warnings to response extensions
          if (!response.extensions) {
            response.extensions = {};
          }

          response.extensions.deprecations = deprecatedFields.map(field => ({
            field: field.path,
            reason: field.reason,
            sunsetDate: field.sunsetDate,
            replacement: field.replacement
          }));

          // Track metrics
          if (trackMetrics) {
            for (const field of deprecatedFields) {
              // Implement your metrics tracking here
              // e.g., incrementCounter('graphql.deprecated_field.usage', { field: field.path });
            }
          }
        }
      };
    }
  };
}
```

---

### Example 6: Migration Helper for Clients

**File:** `/client/src/services/api-client.ts`

```typescript
import { logger } from '../utils/logger';

export interface ApiClientConfig {
  baseUrl: string;
  apiVersion?: string;
  onDeprecationWarning?: (warning: DeprecationWarning) => void;
}

export interface DeprecationWarning {
  endpoint: string;
  sunsetDate: string | null;
  message: string;
  successorUrl: string | null;
}

/**
 * API client with built-in deprecation warning handling
 */
export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      apiVersion: 'v2.0.0',
      ...config
    };
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    // Add API version header
    const headers = {
      'Content-Type': 'application/json',
      'API-Version': this.config.apiVersion!,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check for deprecation headers
    this.handleDeprecationHeaders(endpoint, response);

    // Handle 410 Gone (sunset endpoint)
    if (response.status === 410) {
      const errorData = await response.json();
      throw new Error(
        `Endpoint ${endpoint} has been removed. ${errorData.message} ` +
        `Migrate to: ${errorData.successorUrl}`
      );
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private handleDeprecationHeaders(endpoint: string, response: Response) {
    const deprecationHeader = response.headers.get('Deprecation');

    if (deprecationHeader === 'true') {
      const sunsetDate = response.headers.get('Sunset');
      const warningHeader = response.headers.get('Warning');
      const linkHeader = response.headers.get('Link');

      // Extract successor URL from Link header
      let successorUrl: string | null = null;
      if (linkHeader) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="successor-version"/);
        if (match) {
          successorUrl = match[1];
        }
      }

      // Extract warning message
      let message = 'This endpoint is deprecated';
      if (warningHeader) {
        const warningMatch = warningHeader.match(/299\s*-\s*"([^"]+)"/);
        if (warningMatch) {
          message = warningMatch[1];
        }
      }

      const warning: DeprecationWarning = {
        endpoint,
        sunsetDate,
        message,
        successorUrl
      };

      // Console warning for developers
      console.warn(
        `%c⚠️ API DEPRECATION WARNING`,
        'color: orange; font-weight: bold; font-size: 14px;',
        `\nEndpoint: ${endpoint}`,
        sunsetDate ? `\nSunset Date: ${sunsetDate}` : '',
        `\n${message}`,
        successorUrl ? `\nMigrate to: ${successorUrl}` : ''
      );

      // Call custom handler if provided
      if (this.config.onDeprecationWarning) {
        this.config.onDeprecationWarning(warning);
      }

      // Log for monitoring
      logger.warn('API deprecation warning', warning);
    }
  }
}

// Usage example
const apiClient = new ApiClient({
  baseUrl: 'http://localhost:4000',
  apiVersion: 'v2.0.0',
  onDeprecationWarning: (warning) => {
    // Send to error tracking service
    // e.g., Sentry.captureMessage('API Deprecation', { extra: warning });
  }
});

// Example call
async function fetchRuns() {
  try {
    const runs = await apiClient.fetch('/api/maestro/v2/runs?page=1&pageSize=20');
    return runs;
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    throw error;
  }
}
```

---

## Section 4: Stakeholder Communication Templates

### Template 1: Initial Deprecation Announcement (Email)

**Subject:** [ACTION REQUIRED] API Deprecation Notice - Migrate by {{SUNSET_DATE}}

**To:** All API Consumers
**From:** Platform Engineering Team
**Priority:** High

---

**📢 Deprecation Announcement**

We're improving our API infrastructure to provide better performance, reliability, and developer experience. As part of this effort, we're deprecating the following API endpoints:

**Deprecated Endpoints:**
- `GET /api/maestro/v1/runs` → Migrate to `GET /api/maestro/v2/runs`
- `GraphQL Query: allRuns` → Migrate to `runs` with pagination
- `Run.status` field → Use `Run.state` instead

**Timeline:**
- **Today ({{ANNOUNCEMENT_DATE}})**: Deprecation announced
- **{{ANNOUNCEMENT_DATE + 1 month}}**: Migration guide and support available
- **{{ANNOUNCEMENT_DATE + 5 months}}**: Sunset period begins (final warnings)
- **{{SUNSET_DATE}}**: Deprecated endpoints removed (returns 410 Gone)

**Impact:**
- ✅ All deprecated endpoints continue to work normally until {{SUNSET_DATE}}
- ⚠️ You'll see deprecation warnings in response headers and logs
- ❌ After {{SUNSET_DATE}}, requests will fail with 410 Gone

**What You Need To Do:**

1. **Review the Migration Guide**: [https://docs.internal/migrations/v1-to-v2](https://docs.internal/migrations/v1-to-v2)
2. **Update Your Code**: Use our code examples to migrate (linked below)
3. **Test in Development**: Verify your changes work as expected
4. **Deploy to Production**: Complete migration before {{SUNSET_DATE}}

**Migration Resources:**

- 📖 [V1 → V2 Migration Guide](https://docs.internal/migrations/v1-to-v2)
- 💻 [Code Examples & Recipes](https://docs.internal/migrations/examples)
- 🔧 [Breaking Changes Summary](https://docs.internal/migrations/breaking-changes)
- 💬 [Slack Support Channel](https://slack.com/archives/api-migrations)
- 📧 Email us: platform-engineering@company.com

**Why Are We Deprecating?**

The new v2 endpoints provide:
- **Better Performance**: Pagination reduces payload sizes by 80%
- **Improved UX**: Faster response times for large datasets
- **Consistency**: Standardized field naming across all APIs
- **Future-Proof**: Extensible design for upcoming features

**Need Help?**

- Join our Slack channel: #api-migrations
- Office hours: Tuesdays & Thursdays, 2-3 PM
- Email: platform-engineering@company.com

We're here to support you through this transition. Please don't hesitate to reach out with questions!

**Thank you,**
Platform Engineering Team

---

### Template 2: Halfway Point Reminder (Email)

**Subject:** [REMINDER] API Migration Deadline - {{DAYS_REMAINING}} Days Left

**To:** Active Deprecated Endpoint Users
**From:** Platform Engineering Team
**Priority:** High

---

Hi {{TEAM_NAME}},

You're receiving this email because our monitoring shows your application is still using deprecated API endpoints that will be removed in **{{DAYS_REMAINING}} days** ({{SUNSET_DATE}}).

**Your Usage:**
- Endpoint: `{{ENDPOINT}}`
- Last 7 days: {{REQUEST_COUNT}} requests
- Peak usage: {{PEAK_TIME}}

**Recommended Action:**

We recommend migrating within the next 2 weeks to avoid any service disruption. Here's a quick migration path:

**Old (v1):**
```javascript
const runs = await fetch('/api/maestro/v1/runs');
// Returns: [{ id, status, pipeline, created, completed, owner }]
```

**New (v2):**
```javascript
const response = await fetch('/api/maestro/v2/runs?page=1&pageSize=20');
// Returns: { data: [...], pagination: {...}, links: {...} }
const runs = response.data;
```

**Key Changes:**
- Response is now paginated (default 20 items per page)
- `status` field renamed to `state`
- New fields: `duration`, `metadata`

**Full migration guide**: [https://docs.internal/migrations/v1-to-v2](https://docs.internal/migrations/v1-to-v2)

**Need Assistance?**

If you need help with the migration or have concerns about the timeline, please reach out:
- Reply to this email
- Slack: #api-migrations
- Office hours: Tuesdays & Thursdays, 2-3 PM

We want to ensure a smooth transition for your team!

**Best regards,**
Platform Engineering Team

---

### Template 3: Final Warning (7 Days) (Email)

**Subject:** [URGENT] API Removal in 7 Days - Immediate Action Required

**To:** Still-Active Deprecated Endpoint Users
**From:** Platform Engineering Team
**Priority:** Critical 🔴

---

**⚠️ URGENT: Your application will break in 7 days if you don't take action.**

Hi {{TEAM_NAME}},

Our monitoring shows your application made **{{REQUEST_COUNT}} requests** to deprecated endpoints in the last 24 hours. These endpoints will be **permanently removed in 7 days** on {{SUNSET_DATE}}.

**What Happens on {{SUNSET_DATE}}:**
- ❌ Requests to deprecated endpoints will return **410 Gone**
- ❌ Your application will receive errors instead of data
- ❌ No fallback or grace period available

**Deprecated Endpoints You're Using:**
1. `{{ENDPOINT_1}}` - {{REQUEST_COUNT_1}} requests/day
2. `{{ENDPOINT_2}}` - {{REQUEST_COUNT_2}} requests/day

**Immediate Next Steps:**

1. **TODAY**: Review the migration guide and identify affected code
2. **Tomorrow**: Implement the migration using our code examples
3. **Day 3**: Test in your development/staging environment
4. **Day 4-5**: Deploy to production
5. **Day 6-7**: Monitor and verify

**Emergency Support Available:**

Given the urgency, we're offering expedited support:
- 🚨 **Emergency Slack**: #api-migrations-urgent
- 📞 **Direct escalation**: platform-engineering@company.com (Subject: URGENT MIGRATION)
- 🤝 **Pair programming sessions**: Book time [here](https://calendar.internal/api-migration-help)

**Quick Migration Example:**

```diff
- const runs = await fetch('/api/maestro/v1/runs');
+ const response = await fetch('/api/maestro/v2/runs?page=1&pageSize=20');
+ const runs = response.data;
```

**Full guide**: [https://docs.internal/migrations/v1-to-v2](https://docs.internal/migrations/v1-to-v2)

**Can't Complete in Time?**

If you have a legitimate blocker preventing migration within 7 days, please respond to this email **TODAY** with:
1. Reason for the blocker
2. Estimated time needed for migration
3. Business impact if endpoints are removed

We'll evaluate extension requests on a case-by-case basis, but **approval is not guaranteed**.

This is your final warning. Please act now to avoid service disruption.

**Platform Engineering Team**

---

### Template 4: Slack Announcement

**Channel:** #api-announcements
**Type:** Pinned Message

---

:warning: **API Deprecation Notice** :warning:

We're deprecating several v1 API endpoints to improve performance and consistency. All affected endpoints will be removed on **{{SUNSET_DATE}}**.

**Deprecated:**
• `GET /api/maestro/v1/runs` → Use `/api/maestro/v2/runs`
• GraphQL `allRuns` query → Use `runs` with pagination
• `Run.status` field → Use `Run.state`

**Timeline:**
:calendar: **{{SUNSET_DATE}}** - Removal date ({{DAYS_UNTIL}} days from now)

**Action Required:**
:point_right: Read the migration guide: https://docs.internal/migrations/v1-to-v2
:point_right: Join #api-migrations for support
:point_right: Update your code before the deadline

**Questions?** Drop them in #api-migrations or ping @platform-engineering

---

### Template 5: Post-Deprecation Summary (Email)

**Subject:** API Deprecation Completed - v1 Endpoints Removed

**To:** All API Consumers
**From:** Platform Engineering Team

---

Hi everyone,

We've successfully completed the deprecation and removal of v1 API endpoints. As of today, all deprecated endpoints now return **410 Gone**.

**Migration Summary:**
- **98% of teams** successfully migrated before the deadline
- **2 teams** received approved extensions (completed this week)
- **Zero production incidents** during the transition
- **Average migration time**: 3.5 hours per team

**What Changed:**
- ✅ All v1 endpoints removed
- ✅ All traffic now uses v2 endpoints
- ✅ 80% improvement in API response times (due to pagination)
- ✅ 60% reduction in data transfer costs

**If You Haven't Migrated:**

If you're still seeing 410 errors, you need to migrate immediately:
1. Follow the guide: https://docs.internal/migrations/v1-to-v2
2. Contact us for urgent support: platform-engineering@company.com

**Lessons Learned:**

We've documented our deprecation process and lessons learned here: [https://docs.internal/postmortems/v1-deprecation](https://docs.internal/postmortems/v1-deprecation)

**Thank You:**

Thank you to everyone who completed their migration on time. Your cooperation made this transition smooth and successful!

For future API changes, we'll continue following this deprecation process with clear timelines and migration support.

**Platform Engineering Team**

---

### Template 6: Internal Team Announcement (Slack - Engineering Channels)

**Channel:** #engineering
**Type:** Thread

---

:mega: **Heads up, engineers!**

We're kicking off a deprecation cycle for some v1 API endpoints. Here's what you need to know:

**What's being deprecated:**
```
GET /api/maestro/v1/runs
GraphQL: allRuns query
GraphQL: Run.status field
```

**Timeline:**
• Today: Deprecation headers added
• +1 month: Migration guide published
• +5 months: Sunset warnings
• +6 months ({{SUNSET_DATE}}): Removal

**Why:**
The v2 endpoints add pagination, better performance, and consistent naming. See RFC #342 for technical details.

**What we're doing:**
• Added deprecation middleware to v1 endpoints
• Configured monitoring for deprecated endpoint usage
• Publishing migration guide and code examples
• Offering office hours for migration support

**What you need to do:**
1. Review your services' API usage
2. Plan migrations for any affected code
3. Help other teams if they need support

**Resources:**
• RFC #342: https://rfc.internal/342
• Migration guide: https://docs.internal/migrations/v1-to-v2
• Slack: #api-migrations

Questions? Tag @platform-engineering in #api-migrations

:thread: Reply with which services you own that might be affected

---

## Next Steps

1. **Review and approve this strategy document**
2. **Implement the middleware and utilities** (see Section 3)
3. **Update OpenAPI spec** with deprecation metadata
4. **Create internal migration guide** for your teams
5. **Set up monitoring** for deprecated endpoint usage
6. **Schedule communication** using templates above
7. **Track migration progress** with dashboards

**Recommended Tools:**
- Monitoring: Track deprecated endpoint usage in your existing observability platform
- Documentation: Use tools like Swagger UI with deprecation badges
- Communication: Automate reminders using scheduled Slack workflows
- Metrics: Dashboard showing % of traffic still using deprecated endpoints

---

**Document Version:** 1.0
**Last Updated:** {{TODAY}}
**Owner:** Platform Engineering Team
**Approvers:** [Engineering Lead], [Product Lead], [CTO]
