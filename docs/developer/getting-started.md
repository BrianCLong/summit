# IntelGraph Developer Getting Started Guide

## Overview

Welcome to IntelGraph development! This guide will help you set up your development environment and get started contributing to the IntelGraph platform, including both IntelGraph Core and Maestro autonomous orchestration systems.

## Development Environment Setup

### Prerequisites

#### System Requirements

- **Operating System**: macOS 12+, Ubuntu 20.04+, or Windows 11 with WSL2
- **Memory**: 16GB RAM minimum, 32GB recommended
- **Storage**: 100GB free space minimum
- **Docker**: Docker Desktop or Docker Engine 20.10+
- **Node.js**: v18.x or v20.x (use `nvm` for version management)
- **Python**: 3.11+ for AI/ML components

#### Required Tools

```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Install pnpm (package manager)
npm install -g pnpm@8

# Install Python via pyenv (recommended)
curl https://pyenv.run | bash
pyenv install 3.11.7
pyenv global 3.11.7

# Install Docker Desktop
# https://docs.docker.com/desktop/install/

# Install additional tools
brew install git kubectl helm terraform jq yq
```

#### IDE Setup (VS Code Recommended)

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension GraphQL.vscode-graphql
code --install-extension ms-python.python
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension hashicorp.terraform
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.vscode-json
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode-remote.remote-containers
```

### Repository Setup

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd intelgraph

# Set up Git hooks
git config core.hooksPath .githooks
chmod +x .githooks/*

# Install dependencies
pnpm install

# Set up Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Copy environment template
cp .env.example .env.local
```

### Environment Configuration

Edit `.env.local` with your development settings:

```bash
# .env.local
NODE_ENV=development
LOG_LEVEL=debug

# Database URLs (will be provided by docker-compose)
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword

POSTGRESQL_URL=postgresql://intelgraph:devpassword@localhost:5432/intelgraph_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d

# AI Model APIs (get your own keys)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key

# Maestro Configuration
MAESTRO_PREMIUM_ROUTING_ENABLED=true
MAESTRO_THOMPSON_SAMPLING_EXPLORATION_RATE=0.2
MAESTRO_COMPLIANCE_ENABLED=true

# Development Features
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
ENABLE_DEBUG_ROUTES=true
```

### Docker Development Environment

```bash
# Start development infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps

# Check logs if needed
docker-compose -f docker-compose.dev.yml logs neo4j
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs redis
```

**docker-compose.dev.yml:**

```yaml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-community
    ports:
      - '7474:7474'
      - '7687:7687'
    environment:
      NEO4J_AUTH: neo4j/devpassword
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_apoc_export_file_enabled: true
      NEO4J_apoc_import_file_enabled: true
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
    networks:
      - intelgraph-dev

  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: intelgraph_dev
      POSTGRES_USER: intelgraph
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - intelgraph-dev

  redis:
    image: redis:7.2-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - intelgraph-dev

  elasticsearch:
    image: elasticsearch:8.11.0
    ports:
      - '9200:9200'
      - '9300:9300'
    environment:
      discovery.type: single-node
      xpack.security.enabled: false
      ES_JAVA_OPTS: '-Xms1g -Xmx1g'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - intelgraph-dev

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  postgres_data:
  redis_data:
  elasticsearch_data:

networks:
  intelgraph-dev:
    driver: bridge
```

## Project Structure

```
intelgraph/
├── apps/
│   ├── web/                    # React frontend application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── store/         # Redux/Zustand store
│   │   │   ├── services/      # API services
│   │   │   └── utils/         # Utility functions
│   │   └── public/
│   └── mobile/                # React Native mobile app (future)
├── packages/
│   ├── contracts/             # API contracts and schemas
│   ├── sdk-ts/               # TypeScript SDK
│   └── sdk-py/               # Python SDK
├── server/
│   ├── src/
│   │   ├── graphql/          # GraphQL schema and resolvers
│   │   ├── services/         # Business logic services
│   │   ├── middleware/       # Express middleware
│   │   ├── db/              # Database models and repositories
│   │   ├── ai/              # AI/ML services
│   │   └── conductor/        # Maestro orchestration
│   └── tests/
├── connectors/               # Data connectors (Python)
├── ml/                      # Machine learning models
├── docs/                    # Documentation
├── deploy/                  # Deployment configurations
├── scripts/                 # Development and ops scripts
└── tests/                   # Integration tests
```

## Development Workflow

### Starting the Development Environment

```bash
# 1. Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# 2. Start the development servers
pnpm dev

# This runs multiple services concurrently:
# - IntelGraph Core API server (port 4000)
# - Maestro orchestration service (port 4001)
# - React development server (port 3000)
# - GraphQL Playground (http://localhost:4000/graphql)
```

### Development Scripts

```json
// package.json scripts
{
  "scripts": {
    "dev": "concurrently \"pnpm dev:server\" \"pnpm dev:maestro\" \"pnpm dev:web\"",
    "dev:server": "tsx watch server/src/index.ts",
    "dev:maestro": "tsx watch server/src/conductor/index.ts",
    "dev:web": "cd apps/web && pnpm dev",
    "build": "pnpm build:server && pnpm build:web",
    "build:server": "tsc -p server/tsconfig.json",
    "build:web": "cd apps/web && pnpm build",
    "test": "pnpm test:unit && pnpm test:integration",
    "test:unit": "jest --config jest.config.js",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "graphql:codegen": "graphql-codegen --config codegen.yml"
  }
}
```

### Database Setup and Migrations

```bash
# Initialize development database
pnpm db:migrate

# Seed with sample data
pnpm db:seed

# Reset database (development only)
pnpm db:reset
```

**Migration Example:**

```typescript
// migrations/001_initial_setup.ts
export async function up(client: Client) {
  // PostgreSQL schema
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orchestration_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      tenant_id UUID NOT NULL,
      query TEXT NOT NULL,
      response JSONB,
      cost DECIMAL(10,4),
      processing_time INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Neo4j constraints and indexes
  const neo4jClient = getNeo4jClient();
  await neo4jClient.run(`
    CREATE CONSTRAINT entity_id IF NOT EXISTS
    FOR (e:Entity) REQUIRE e.id IS UNIQUE
  `);

  await neo4jClient.run(`
    CREATE INDEX entity_type_index IF NOT EXISTS
    FOR (e:Entity) ON (e.type)
  `);
}
```

## Code Standards and Best Practices

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types"],
      "@/services": ["./src/services"],
      "@/utils": ["./src/utils"],
      "@/components": ["./apps/web/src/components"]
    }
  },
  "include": ["src/**/*", "apps/**/*", "packages/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Coding Standards

#### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts` or `PascalCase.tsx` for React components
- **Directories**: `kebab-case`

#### Code Organization

```typescript
// Good: Organized imports
import React from 'react';
import { type ReactNode } from 'react';

import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

import type { User } from './types';

// Good: Type-first development
interface UserProfileProps {
  user: User;
  onUpdate: (user: Partial<User>) => void;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdate,
  className,
}) => {
  // Component implementation
};

// Good: Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'analyst', 'admin']).default('user'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// Good: Service layer
export class UserService {
  constructor(
    private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const validatedInput = CreateUserSchema.parse(input);

    try {
      const user = await this.db.user.create({
        data: validatedInput,
      });

      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', { error, input });
      throw new Error('Failed to create user');
    }
  }
}
```

## Testing Strategy

### Testing Framework Setup

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src', '<rootDir>/apps'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    'apps/**/*.{ts,tsx}',
    '!server/src/**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/server/src/$1',
    '^@/components/(.*)$': '<rootDir>/apps/web/src/components/$1',
  },
};
```

### Unit Testing Examples

```typescript
// server/src/services/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { mockDatabase, mockLogger } from '../../__mocks__';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockDatabase, mockLogger);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
      };

      const expectedUser = {
        id: 'user-123',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(input);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockDatabase.user.create).toHaveBeenCalledWith({
        data: input,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User created successfully',
        { userId: 'user-123' },
      );
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const input = {
        email: 'invalid-email',
        name: 'Test User',
        role: 'user' as const,
      };

      // Act & Assert
      await expect(userService.createUser(input)).rejects.toThrow();
    });
  });
});
```

### Integration Testing

```typescript
// server/src/__tests__/integration/graphql.integration.test.ts
import { ApolloServer } from '@apollo/server';
import { createTestClient } from 'apollo-server-testing';
import { gql } from 'graphql-tag';

import { createServer } from '../server';
import { setupTestDatabase, cleanupTestDatabase } from '../../tests/helpers';

describe('GraphQL Integration Tests', () => {
  let server: ApolloServer;
  let query: any;
  let mutate: any;

  beforeAll(async () => {
    await setupTestDatabase();
    server = await createServer({ testing: true });
    const client = createTestClient(server);
    query = client.query;
    mutate = client.mutate;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await server.stop();
  });

  describe('User Queries', () => {
    it('should fetch user profile', async () => {
      // Arrange
      const GET_USER = gql`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            email
            name
            role
          }
        }
      `;

      // Act
      const response = await query({
        query: GET_USER,
        variables: { id: 'test-user-id' },
      });

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.user).toMatchObject({
        id: 'test-user-id',
        email: expect.any(String),
        name: expect.any(String),
        role: expect.any(String),
      });
    });
  });
});
```

### End-to-End Testing

```typescript
// tests/e2e/graph-analysis.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Graph Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email-input]', 'analyst@example.com');
    await page.fill('[data-testid=password-input]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create and analyze a graph', async ({ page }) => {
    // Navigate to graph creation
    await page.click('[data-testid=create-graph-button]');

    // Fill graph details
    await page.fill('[data-testid=graph-name-input]', 'Test Analysis Graph');
    await page.fill('[data-testid=graph-description-input]', 'E2E test graph');
    await page.click('[data-testid=create-button]');

    // Wait for graph to be created
    await expect(page.locator('[data-testid=graph-canvas]')).toBeVisible();

    // Add an entity
    await page.click('[data-testid=add-entity-button]');
    await page.selectOption('[data-testid=entity-type-select]', 'Person');
    await page.fill('[data-testid=entity-name-input]', 'John Doe');
    await page.click('[data-testid=confirm-entity-button]');

    // Verify entity was added
    await expect(page.locator('[data-testid=graph-node]')).toHaveCount(1);

    // Run AI analysis
    await page.click('[data-testid=ai-analysis-button]');
    await page.selectOption(
      '[data-testid=analysis-type-select]',
      'community_detection',
    );
    await page.click('[data-testid=start-analysis-button]');

    // Wait for analysis to complete
    await expect(page.locator('[data-testid=analysis-results]')).toBeVisible({
      timeout: 30000,
    });

    // Verify analysis results
    const resultsText = await page.textContent(
      '[data-testid=analysis-results]',
    );
    expect(resultsText).toContain('Analysis completed');
  });
});
```

## GraphQL Development

### Schema First Approach

```graphql
# schema.graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  createdAt: DateTime!
  updatedAt: DateTime!
  graphs: [Graph!]!
}

enum Role {
  USER
  ANALYST
  ADMIN
}

type Graph {
  id: ID!
  name: String!
  description: String
  nodeCount: Int!
  edgeCount: Int!
  tags: [String!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  owner: User!
  collaborators: [Collaborator!]!
  entities(
    type: String
    search: String
    page: Int = 1
    limit: Int = 20
  ): EntityConnection!
}

type Entity {
  id: ID!
  type: String!
  properties: JSON!
  metadata: EntityMetadata!
  createdAt: DateTime!
  updatedAt: DateTime!
  relationships(type: String): [Relationship!]!
}

type Query {
  me: User
  user(id: ID!): User
  graph(id: ID!): Graph
  graphs(
    search: String
    tags: [String!]
    page: Int = 1
    limit: Int = 20
  ): GraphConnection!

  # AI-powered queries
  analyzeGraph(id: ID!, type: AnalysisType!): AnalysisResult!
  suggestEntities(graphId: ID!, query: String!): [EntitySuggestion!]!
}

type Mutation {
  # User management
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!

  # Graph management
  createGraph(input: CreateGraphInput!): Graph!
  updateGraph(id: ID!, input: UpdateGraphInput!): Graph!
  deleteGraph(id: ID!): Boolean!

  # Entity management
  createEntity(graphId: ID!, input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
  deleteEntity(id: ID!): Boolean!

  # Relationship management
  createRelationship(input: CreateRelationshipInput!): Relationship!
  updateRelationship(id: ID!, input: UpdateRelationshipInput!): Relationship!
  deleteRelationship(id: ID!): Boolean!

  # AI operations
  enhanceEntity(id: ID!, provider: AIProvider = AUTO): Entity!
  detectAnomalies(graphId: ID!): [AnomalyDetection!]!
}

type Subscription {
  graphUpdated(id: ID!): GraphUpdateEvent!
  entityAdded(graphId: ID!): Entity!
  analysisProgress(jobId: ID!): AnalysisProgress!
}
```

### Code Generation

```yaml
# codegen.yml
overwrite: true
schema: 'server/src/graphql/schema.graphql'
documents: 'apps/web/src/**/*.graphql'
generates:
  server/src/generated/graphql-types.ts:
    plugins:
      - 'typescript'
      - 'typescript-resolvers'
    config:
      useIndexSignature: true
      mappers:
        User: '../db/models/User#UserModel'
        Graph: '../db/models/Graph#GraphModel'
        Entity: '../db/models/Entity#EntityModel'

  apps/web/src/generated/graphql.ts:
    plugins:
      - 'typescript'
      - 'typescript-operations'
      - 'typescript-react-apollo'
    config:
      withHooks: true
      withHOC: false
      withComponent: false
```

### Resolver Implementation

```typescript
// server/src/graphql/resolvers/user.resolvers.ts
import { Resolvers, User } from '../generated/graphql-types';
import { Context } from '../context';
import { ForbiddenError, UserInputError } from 'apollo-server-express';

export const userResolvers: Resolvers = {
  Query: {
    me: async (_parent, _args, context: Context): Promise<User | null> => {
      if (!context.user) {
        throw new ForbiddenError('Authentication required');
      }
      return context.dataSources.userService.findById(context.user.id);
    },

    user: async (_parent, { id }, context: Context): Promise<User | null> => {
      if (!context.user) {
        throw new ForbiddenError('Authentication required');
      }

      const user = await context.dataSources.userService.findById(id);
      if (!user) {
        throw new UserInputError('User not found');
      }

      // Check permissions
      if (user.id !== context.user.id && context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Insufficient permissions');
      }

      return user;
    },
  },

  Mutation: {
    createUser: async (_parent, { input }, context: Context): Promise<User> => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        return await context.dataSources.userService.create(input);
      } catch (error) {
        context.logger.error('Failed to create user', { error, input });
        throw new UserInputError('Failed to create user');
      }
    },
  },

  User: {
    graphs: async (parent: User, _args, context: Context) => {
      return context.dataSources.graphService.findByUserId(parent.id);
    },
  },
};
```

## Frontend Development

### React Component Development

```tsx
// apps/web/src/components/graph/GraphCanvas.tsx
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import $ from 'jquery';

import { useGraph } from '@/hooks/useGraph';
import { useRealtime } from '@/hooks/useRealtime';
import { GraphLayoutEngine } from '@/services/graph-layout';
import { GraphEventHandler } from '@/services/graph-events';

import type { Graph, Entity, Relationship } from '@/types';

interface GraphCanvasProps {
  graphId: string;
  readonly?: boolean;
  onEntitySelect?: (entity: Entity) => void;
  onRelationshipSelect?: (relationship: Relationship) => void;
  className?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphId,
  readonly = false,
  onEntitySelect,
  onRelationshipSelect,
  className = '',
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: graph, loading, error } = useGraph(graphId);
  const { subscribe, unsubscribe } = useRealtime();

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!canvasRef.current || !graph || isInitialized) return;

    const cy = cytoscape({
      container: canvasRef.current,
      style: getGraphStyles(),
      layout: { name: 'force-directed', animate: true },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.1,
    });

    cyRef.current = cy;

    // Set up event handlers
    const eventHandler = new GraphEventHandler(cy, {
      readonly,
      onEntitySelect,
      onRelationshipSelect,
    });

    eventHandler.initialize();

    setIsInitialized(true);

    return () => {
      cy.destroy();
      setIsInitialized(false);
    };
  }, [graph, isInitialized, readonly, onEntitySelect, onRelationshipSelect]);

  // Update graph data
  useEffect(() => {
    if (!cyRef.current || !graph) return;

    const elements = GraphLayoutEngine.convertToElements(
      graph.entities,
      graph.relationships,
    );

    cyRef.current.batch(() => {
      cyRef.current!.elements().remove();
      cyRef.current!.add(elements);
      cyRef.current!.layout({ name: 'force-directed' }).run();
    });
  }, [graph]);

  // Real-time updates
  useEffect(() => {
    const handleGraphUpdate = (update: GraphUpdateEvent) => {
      if (!cyRef.current) return;

      switch (update.type) {
        case 'ENTITY_ADDED':
          cyRef.current.add(GraphLayoutEngine.convertEntity(update.entity));
          break;
        case 'ENTITY_UPDATED':
          const entityNode = cyRef.current.$(`#${update.entity.id}`);
          entityNode.data(update.entity.properties);
          break;
        case 'ENTITY_REMOVED':
          cyRef.current.$(`#${update.entityId}`).remove();
          break;
        case 'RELATIONSHIP_ADDED':
          cyRef.current.add(
            GraphLayoutEngine.convertRelationship(update.relationship),
          );
          break;
        case 'RELATIONSHIP_REMOVED':
          cyRef.current.$(`#${update.relationshipId}`).remove();
          break;
      }
    };

    subscribe(`graph.${graphId}`, handleGraphUpdate);

    return () => {
      unsubscribe(`graph.${graphId}`);
    };
  }, [graphId, subscribe, unsubscribe]);

  if (loading) {
    return (
      <div className={`graph-canvas-loading ${className}`}>
        <div className="spinner" />
        <p>Loading graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`graph-canvas-error ${className}`}>
        <p>Error loading graph: {error.message}</p>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className={`graph-canvas ${className}`}
      data-testid="graph-canvas"
    />
  );
};

// Helper function for graph styles
function getGraphStyles(): cytoscape.Stylesheet[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': '#4A90E2',
        'border-color': '#2E5A8A',
        'border-width': 2,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: 'white',
        'font-size': '12px',
        width: 'mapData(weight, 0, 100, 20, 80)',
        height: 'mapData(weight, 0, 100, 20, 80)',
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': '#9CA3AF',
        'target-arrow-color': '#9CA3AF',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        width: 2,
        label: 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': '#F59E0B',
        'border-color': '#D97706',
        'border-width': 3,
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#F59E0B',
        'target-arrow-color': '#F59E0B',
        width: 3,
      },
    },
  ];
}
```

### Custom Hooks

```typescript
// apps/web/src/hooks/useGraph.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { graphService } from '@/services/graph.service';
import { useAuth } from './useAuth';

import type { Graph, CreateGraphInput, UpdateGraphInput } from '@/types';

export function useGraph(graphId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['graph', graphId],
    queryFn: () => graphService.getGraph(graphId),
    enabled: !!user && !!graphId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGraphs(filters?: GraphFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['graphs', filters],
    queryFn: () => graphService.getGraphs(filters),
    enabled: !!user,
  });
}

export function useCreateGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGraphInput) => graphService.createGraph(input),
    onSuccess: (newGraph) => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
      queryClient.setQueryData(['graph', newGraph.id], newGraph);
    },
  });
}

export function useUpdateGraph(graphId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGraphInput) =>
      graphService.updateGraph(graphId, input),
    onSuccess: (updatedGraph) => {
      queryClient.setQueryData(['graph', graphId], updatedGraph);
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useDeleteGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (graphId: string) => graphService.deleteGraph(graphId),
    onSuccess: (_, graphId) => {
      queryClient.removeQueries({ queryKey: ['graph', graphId] });
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useGraphOperations(graphId: string) {
  const createGraphMutation = useCreateGraph();
  const updateGraphMutation = useUpdateGraph(graphId);
  const deleteGraphMutation = useDeleteGraph();

  const createGraph = useCallback(
    (input: CreateGraphInput) => {
      return createGraphMutation.mutateAsync(input);
    },
    [createGraphMutation],
  );

  const updateGraph = useCallback(
    (input: UpdateGraphInput) => {
      return updateGraphMutation.mutateAsync(input);
    },
    [updateGraphMutation],
  );

  const deleteGraph = useCallback(() => {
    return deleteGraphMutation.mutateAsync(graphId);
  }, [deleteGraphMutation, graphId]);

  return {
    createGraph,
    updateGraph,
    deleteGraph,
    isLoading:
      createGraphMutation.isPending ||
      updateGraphMutation.isPending ||
      deleteGraphMutation.isPending,
  };
}
```

## AI/ML Development

### Adding New AI Services

```python
# ml/services/new_analysis_service.py
from typing import Dict, List, Any, Optional
import numpy as np
from pydantic import BaseModel, Field

from ..base import BaseMLService
from ..types import AnalysisResult, GraphData
from ..utils import validate_graph_data, compute_metrics

class NewAnalysisConfig(BaseModel):
    """Configuration for new analysis service."""
    algorithm: str = Field(default="default", description="Algorithm to use")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    iterations: int = Field(default=100, ge=1, le=1000)
    include_metadata: bool = Field(default=True)

class NewAnalysisService(BaseMLService):
    """Service for performing new type of graph analysis."""

    def __init__(self, config: Optional[NewAnalysisConfig] = None):
        super().__init__()
        self.config = config or NewAnalysisConfig()
        self.logger = self.get_logger(__name__)

    async def analyze(
        self,
        graph_data: GraphData,
        config_override: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """
        Perform new analysis on graph data.

        Args:
            graph_data: Input graph data
            config_override: Optional configuration overrides

        Returns:
            Analysis results with insights and metrics
        """
        try:
            # Validate input data
            validate_graph_data(graph_data)

            # Merge configuration
            config = self._merge_config(config_override)

            # Perform analysis
            self.logger.info(f"Starting analysis with algorithm: {config.algorithm}")

            results = await self._run_analysis(graph_data, config)

            # Generate insights
            insights = self._generate_insights(results, graph_data)

            # Compute quality metrics
            metrics = compute_metrics(results, graph_data)

            return AnalysisResult(
                analysis_type="new_analysis",
                results=results,
                insights=insights,
                metrics=metrics,
                config=config.dict()
            )

        except Exception as e:
            self.logger.error(f"Analysis failed: {str(e)}")
            raise

    async def _run_analysis(
        self,
        graph_data: GraphData,
        config: NewAnalysisConfig
    ) -> Dict[str, Any]:
        """Run the core analysis algorithm."""
        # Implementation specific to your analysis
        # This is where you'd implement the actual ML/AI logic

        nodes = graph_data.nodes
        edges = graph_data.edges

        # Example: Simple clustering analysis
        results = {
            "clusters": self._perform_clustering(nodes, edges, config),
            "node_scores": self._compute_node_scores(nodes, config),
            "edge_weights": self._compute_edge_weights(edges, config)
        }

        return results

    def _perform_clustering(
        self,
        nodes: List[Dict],
        edges: List[Dict],
        config: NewAnalysisConfig
    ) -> List[Dict]:
        """Perform clustering analysis."""
        # Implement clustering logic
        clusters = []
        # ... clustering implementation
        return clusters

    def _compute_node_scores(
        self,
        nodes: List[Dict],
        config: NewAnalysisConfig
    ) -> Dict[str, float]:
        """Compute importance scores for nodes."""
        scores = {}
        for node in nodes:
            # Implement scoring logic
            scores[node["id"]] = self._calculate_score(node, config)
        return scores

    def _generate_insights(
        self,
        results: Dict[str, Any],
        graph_data: GraphData
    ) -> List[Dict[str, Any]]:
        """Generate human-readable insights from results."""
        insights = []

        # Example insights
        cluster_count = len(results.get("clusters", []))
        insights.append({
            "type": "cluster_analysis",
            "description": f"Identified {cluster_count} distinct clusters in the graph",
            "confidence": 0.85,
            "actionable": True,
            "details": {
                "cluster_count": cluster_count,
                "largest_cluster_size": max(
                    len(cluster["nodes"]) for cluster in results.get("clusters", [])
                ) if results.get("clusters") else 0
            }
        })

        return insights

# Integration with TypeScript backend
class NewAnalysisServiceAPI:
    """API wrapper for the new analysis service."""

    def __init__(self):
        self.service = NewAnalysisService()

    async def analyze_graph(self, graph_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """API endpoint for graph analysis."""
        try:
            # Fetch graph data (implement based on your data layer)
            graph_data = await self._fetch_graph_data(graph_id)

            # Run analysis
            result = await self.service.analyze(graph_data, options)

            # Return serializable result
            return {
                "success": True,
                "data": result.dict(),
                "execution_time": result.execution_time
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
```

### TypeScript Integration

```typescript
// server/src/ai/new-analysis.service.ts
import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { promisify } from 'util';

import { Logger } from '../utils/logger';
import { GraphService } from '../services/graph.service';

import type { AnalysisResult, NewAnalysisOptions } from '../types';

@Injectable()
export class NewAnalysisService {
  constructor(
    private readonly logger: Logger,
    private readonly graphService: GraphService,
  ) {}

  async analyzeGraph(
    graphId: string,
    options: NewAnalysisOptions = {},
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Fetch graph data
      const graph = await this.graphService.getGraphWithData(graphId);

      // Prepare analysis request
      const analysisRequest = {
        graph_data: {
          nodes: graph.entities.map((entity) => ({
            id: entity.id,
            type: entity.type,
            properties: entity.properties,
          })),
          edges: graph.relationships.map((rel) => ({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            type: rel.type,
            properties: rel.properties,
          })),
        },
        options,
      };

      // Call Python service
      const result = await this.callPythonService(
        'new_analysis_service',
        'analyze_graph',
        analysisRequest,
      );

      const executionTime = Date.now() - startTime;

      this.logger.info('New analysis completed', {
        graphId,
        executionTime,
        insights: result.data.insights.length,
      });

      return {
        analysisType: 'new_analysis',
        graphId,
        results: result.data.results,
        insights: result.data.insights,
        metadata: {
          executionTime,
          options,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('New analysis failed', { graphId, error });
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  private async callPythonService(
    service: string,
    method: string,
    data: any,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        '-c',
        `
import sys
import json
from ml.services.${service} import ${service
          .split('_')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('')}API

try:
    service = ${service
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('')}API()
    data = json.loads(sys.argv[1])
    result = await service.${method}(data['graph_data'], data['options'])
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
        `,
        JSON.stringify(data),
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            if (result.success) {
              resolve(result);
            } else {
              reject(new Error(result.error));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Python response: ${output}`));
          }
        } else {
          reject(
            new Error(`Python process exited with code ${code}: ${error}`),
          );
        }
      });
    });
  }
}
```

## Debugging and Development Tools

### VS Code Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/src/index.ts",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      },
      "runtimeArgs": ["-r", "tsx/cjs"],
      "sourceMaps": true,
      "restart": true,
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Maestro",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/src/conductor/index.ts",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "maestro:*"
      },
      "runtimeArgs": ["-r", "tsx/cjs"],
      "sourceMaps": true,
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Development Scripts

```bash
#!/bin/bash
# scripts/dev-setup.sh

echo "🚀 Setting up IntelGraph development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
node --version || { echo "❌ Node.js not found. Please install Node.js 18+"; exit 1; }
docker --version || { echo "❌ Docker not found. Please install Docker"; exit 1; }
kubectl version --client || { echo "❌ kubectl not found. Please install kubectl"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install || { echo "❌ Failed to install dependencies"; exit 1; }

# Set up Git hooks
echo "🔧 Setting up Git hooks..."
chmod +x .githooks/*
git config core.hooksPath .githooks

# Start infrastructure
echo "🐳 Starting development infrastructure..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
until docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U intelgraph; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

until docker-compose -f docker-compose.dev.yml exec neo4j cypher-shell -u neo4j -p devpassword "RETURN 'ready'"; do
  echo "Waiting for Neo4j..."
  sleep 2
done

until docker-compose -f docker-compose.dev.yml exec redis redis-cli ping; do
  echo "Waiting for Redis..."
  sleep 2
done

# Run migrations
echo "🗄️ Running database migrations..."
pnpm db:migrate || { echo "❌ Database migration failed"; exit 1; }

# Seed development data
echo "🌱 Seeding development data..."
pnpm db:seed || { echo "❌ Database seeding failed"; exit 1; }

# Generate GraphQL types
echo "🔄 Generating GraphQL types..."
pnpm graphql:codegen || { echo "❌ GraphQL codegen failed"; exit 1; }

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Run 'pnpm dev' to start development servers"
echo "  2. Open http://localhost:3000 for the web app"
echo "  3. Open http://localhost:4000/graphql for GraphQL Playground"
echo "  4. Open http://localhost:4001/v1/health for Maestro health check"
echo ""
echo "📚 Documentation:"
echo "  - Architecture: docs/ARCHITECTURE.md"
echo "  - API Reference: openapi/intelgraph-core-api.yaml"
echo "  - Runbooks: docs/runbooks/"
```

## Contributing Guidelines

### Pull Request Process

1. **Branch Naming**
   - Features: `feature/description-of-feature`
   - Bug fixes: `fix/description-of-fix`
   - Hotfixes: `hotfix/description-of-hotfix`
   - Refactoring: `refactor/description-of-refactoring`

2. **Commit Messages**

   ```
   type(scope): description

   Longer description if needed

   Fixes #123
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

3. **PR Template**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

### Code Review Guidelines

#### For Authors

- Keep PRs small and focused
- Write clear descriptions
- Include tests for new functionality
- Update documentation as needed
- Respond promptly to feedback

#### For Reviewers

- Review within 24 hours
- Focus on logic, security, and maintainability
- Ask questions if unclear
- Provide constructive feedback
- Approve when satisfied

## Getting Help

### Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [API Documentation](../../openapi/)
- [Deployment Guide](../deployment/production-deployment-guide.md)
- [Troubleshooting](../runbooks/)

### Community

- **Slack**: `#intelgraph-dev`
- **Weekly Standup**: Fridays 10 AM PT
- **Office Hours**: Tuesdays 2-3 PM PT

### Support

- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Issues with `enhancement` label
- **Security Issues**: security@intelgraph.ai
- **General Questions**: dev@intelgraph.ai

---

**Document Version**: 1.0
**Last Updated**: $(date)
**Maintained By**: Developer Experience Team
