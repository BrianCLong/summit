# IntelGraph MVP-0 Implementation Package

## Overview

This package contains the next automated development steps for the IntelGraph platform, building on the foundation created by the development automation script. It implements the core MVP-0 features identified in the project analysis.

## Current State Analysis

Based on the project knowledge, the IntelGraph repository currently has:

- ✅ Basic project structure
- ✅ Initial documentation
- ⚠️ Repository hygiene issues (committed .env, .DS_Store, zip files)
- ⚠️ Inconsistent file naming
- ❌ Missing CI/CD pipeline
- ❌ No working end-to-end functionality

## Implementation Plan

### Phase 1: Foundation (Week 1)

1. **Repository Cleanup** - Remove sensitive files, normalize structure
2. **CI/CD Setup** - GitHub Actions, security scanning, automated testing
3. **Development Environment** - Docker containers for all services
4. **Core Authentication** - JWT-based auth with roles

### Phase 2: Core Features (Week 2)

1. **GraphQL API** - Complete CRUD operations for all entities
2. **Neo4j Integration** - Graph database with proper constraints
3. **React Frontend** - Authentication and basic investigation management
4. **Graph Visualization** - Cytoscape.js integration

## Implementation Steps

### Step 1: Core Server Implementation

#### 1.1 Authentication Service (`server/src/services/AuthService.js`)

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class AuthService {
  constructor(userService) {
    this.userService = userService;
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async register(email, username, password) {
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.userService.create({
        id: uuidv4(),
        email,
        username,
        password: hashedPassword,
        role: 'ANALYST',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info(`User registered successfully: ${email}`);
      return { user: this.sanitizeUser(user), ...tokens };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      const tokens = this.generateTokens(user);

      logger.info(`User logged in successfully: ${email}`);
      return { user: this.sanitizeUser(user), ...tokens };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: 'intelgraph',
    });

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      this.refreshSecret,
      {
        expiresIn: this.refreshExpiry,
        issuer: 'intelgraph',
      },
    );

    return { accessToken, refreshToken };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = AuthService;
```

#### 1.2 Graph Service (`server/src/services/GraphService.js`)

```javascript
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

class GraphService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password',
      ),
    );
  }

  async createConstraints() {
    const session = this.driver.session();
    try {
      // Create constraints for entities
      await session.run(`
        CREATE CONSTRAINT entity_id IF NOT EXISTS
        FOR (e:Entity) REQUIRE e.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT user_id IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT investigation_id IF NOT EXISTS
        FOR (i:Investigation) REQUIRE i.id IS UNIQUE
      `);

      // Create indexes for performance
      await session.run(`
        CREATE INDEX entity_type_index IF NOT EXISTS
        FOR (e:Entity) ON (e.type)
      `);

      await session.run(`
        CREATE INDEX entity_name_index IF NOT EXISTS
        FOR (e:Entity) ON (e.name)
      `);

      logger.info('Neo4j constraints and indexes created successfully');
    } catch (error) {
      logger.error('Failed to create constraints:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async createEntity(entityData) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        CREATE (e:Entity {
          id: $id,
          type: $type,
          name: $name,
          attributes: $attributes,
          investigationId: $investigationId,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN e
      `,
        entityData,
      );

      return result.records[0].get('e').properties;
    } catch (error) {
      logger.error('Failed to create entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async createRelationship(relationshipData) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (from:Entity {id: $fromEntityId})
        MATCH (to:Entity {id: $toEntityId})
        CREATE (from)-[r:RELATES_TO {
          id: $id,
          type: $type,
          attributes: $attributes,
          confidence: $confidence,
          investigationId: $investigationId,
          createdAt: datetime(),
          updatedAt: datetime()
        }]->(to)
        RETURN r, from, to
      `,
        relationshipData,
      );

      if (result.records.length === 0) {
        throw new Error('Could not create relationship - entities not found');
      }

      return {
        relationship: result.records[0].get('r').properties,
        fromEntity: result.records[0].get('from').properties,
        toEntity: result.records[0].get('to').properties,
      };
    } catch (error) {
      logger.error('Failed to create relationship:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getInvestigationGraph(investigationId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity {investigationId: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATES_TO {investigationId: $investigationId}]->(e2:Entity)
        RETURN e, r, e2
      `,
        { investigationId },
      );

      const entities = new Map();
      const relationships = [];

      result.records.forEach((record) => {
        const entity = record.get('e');
        if (entity && !entities.has(entity.properties.id)) {
          entities.set(entity.properties.id, entity.properties);
        }

        const entity2 = record.get('e2');
        if (entity2 && !entities.has(entity2.properties.id)) {
          entities.set(entity2.properties.id, entity2.properties);
        }

        const relationship = record.get('r');
        if (relationship) {
          relationships.push(relationship.properties);
        }
      });

      return {
        entities: Array.from(entities.values()),
        relationships,
      };
    } catch (error) {
      logger.error('Failed to get investigation graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async runCommunityDetection(investigationId) {
    const session = this.driver.session();
    try {
      // First, create a projected graph
      await session.run(
        `
        CALL gds.graph.project(
          'investigation-' + $investigationId,
          {
            Entity: {
              filter: "n.investigationId = '" + $investigationId + "'"
            }
          },
          {
            RELATES_TO: {
              filter: "r.investigationId = '" + $investigationId + "'"
            }
          }
        )
      `,
        { investigationId },
      );

      // Run Louvain community detection
      const result = await session.run(
        `
        CALL gds.louvain.write(
          'investigation-' + $investigationId,
          {
            writeProperty: 'community'
          }
        )
        YIELD communityCount, modularity
        RETURN communityCount, modularity
      `,
        { investigationId },
      );

      // Clean up the projected graph
      await session.run(
        `
        CALL gds.graph.drop('investigation-' + $investigationId)
      `,
        { investigationId },
      );

      return result.records[0].toObject();
    } catch (error) {
      logger.error('Failed to run community detection:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

module.exports = GraphService;
```

#### 1.3 Complete GraphQL Resolvers

```javascript
// server/src/graphql/resolvers/userResolvers.js
const AuthService = require('../../services/AuthService');
const UserService = require('../../services/UserService');

const authService = new AuthService(new UserService());

module.exports = {
  Query: {
    me: async (parent, args, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.user;
    },
  },
  Mutation: {
    register: async (parent, { email, username, password }) => {
      return await authService.register(email, username, password);
    },
    login: async (parent, { email, password }) => {
      return await authService.login(email, password);
    },
  },
};

// server/src/graphql/resolvers/investigationResolvers.js
const InvestigationService = require('../../services/InvestigationService');
const { PubSub } = require('graphql-subscriptions');

const investigationService = new InvestigationService();
const pubsub = new PubSub();

module.exports = {
  Query: {
    investigations: async (parent, args, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return await investigationService.findByUserId(context.user.id);
    },
    investigation: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return await investigationService.findById(id);
    },
  },
  Mutation: {
    createInvestigation: async (parent, { input }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const investigation = await investigationService.create({
        ...input,
        createdBy: context.user.id,
      });

      pubsub.publish('INVESTIGATION_CREATED', {
        investigationUpdated: investigation,
      });

      return investigation;
    },
  },
  Subscription: {
    investigationUpdated: {
      subscribe: () =>
        pubsub.asyncIterator([
          'INVESTIGATION_CREATED',
          'INVESTIGATION_UPDATED',
        ]),
    },
  },
};
```

### Step 2: Frontend Implementation

#### 2.1 Apollo Client Setup (`client/src/services/apollo.js`)

```javascript
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`,
        );
      });
    }

    if (networkError) {
      console.error(`Network error: ${networkError}`);
    }
  },
);

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
```

#### 2.2 Redux Store Setup (`client/src/store/index.js`)

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import investigationSlice from './slices/investigationSlice';
import graphSlice from './slices/graphSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    investigations: investigationSlice,
    graph: graphSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 2.3 Graph Visualization Component (`client/src/components/graph/GraphViewer.js`)

```javascript
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Box, Paper, Typography, Fab, Menu, MenuItem } from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon } from '@mui/icons-material';

const GraphViewer = ({
  entities = [],
  relationships = [],
  onEntityClick,
  onAddEntity,
}) => {
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (!cyRef.current) return;

    const cytoscape_instance = cytoscape({
      container: cyRef.current,
      elements: [
        ...entities.map((entity) => ({
          data: {
            id: entity.id,
            label: entity.name,
            type: entity.type,
            ...entity.attributes,
          },
          classes: `entity ${entity.type.toLowerCase()}`,
        })),
        ...relationships.map((rel) => ({
          data: {
            id: rel.id,
            source: rel.fromEntityId,
            target: rel.toEntityId,
            label: rel.type,
            confidence: rel.confidence,
          },
          classes: 'relationship',
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#00bcd4',
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#ffffff',
            'font-size': '12px',
            width: '60px',
            height: '60px',
            'border-width': 2,
            'border-color': '#ffffff',
          },
        },
        {
          selector: 'node.person',
          style: {
            'background-color': '#ff9800',
            shape: 'ellipse',
          },
        },
        {
          selector: 'node.organization',
          style: {
            'background-color': '#4caf50',
            shape: 'rectangle',
          },
        },
        {
          selector: 'node.location',
          style: {
            'background-color': '#f44336',
            shape: 'triangle',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            color: '#999',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#fff',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 200,
      },
    });

    // Event handlers
    cytoscape_instance.on('tap', 'node', (evt) => {
      const node = evt.target;
      if (onEntityClick) {
        onEntityClick(node.data());
      }
    });

    cytoscape_instance.on('cxttap', 'node', (evt) => {
      evt.preventDefault();
      setAnchorEl(evt.originalEvent);
    });

    setCy(cytoscape_instance);

    return () => {
      cytoscape_instance.destroy();
    };
  }, [entities, relationships, onEntityClick]);

  const handleLayoutChange = (layoutName) => {
    if (cy) {
      cy.layout({ name: layoutName }).run();
    }
    setAnchorEl(null);
  };

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <Paper
        ref={cyRef}
        sx={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          backgroundColor: '#0a0e1a',
          border: '1px solid #333',
        }}
      />

      <Fab
        color="primary"
        aria-label="add entity"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        onClick={onAddEntity}
      >
        <AddIcon />
      </Fab>

      <Fab
        color="secondary"
        aria-label="settings"
        sx={{ position: 'absolute', bottom: 16, right: 80 }}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <SettingsIcon />
      </Fab>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleLayoutChange('cose')}>
          Force Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('circle')}>
          Circle Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('grid')}>
          Grid Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('breadthfirst')}>
          Hierarchical Layout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GraphViewer;
```

### Step 3: Docker Development Environment

#### 3.1 Server Dockerfile (`server/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create logs directory
RUN mkdir -p logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js

EXPOSE 4000

CMD ["npm", "start"]
```

#### 3.2 Client Dockerfile (`client/Dockerfile`)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 4: Testing Infrastructure

#### 4.1 Server Test Setup (`server/src/tests/setup.js`)

```javascript
const { GraphService } = require('../services/GraphService');
const { Pool } = require('pg');

// Setup test database
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.NEO4J_URI = 'bolt://localhost:7687';
  process.env.POSTGRES_URL =
    'postgresql://postgres:testpassword@localhost:5432/intelgraph_test';

  // Clear test databases
  const graphService = new GraphService();
  await graphService.clearDatabase();

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  await pool.query('TRUNCATE TABLE users, investigations CASCADE');
  await pool.end();
});

afterAll(async () => {
  // Cleanup
});
```

#### 4.2 GraphQL Integration Tests (`server/src/tests/integration/graphql.test.js`)

```javascript
const request = require('supertest');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const typeDefs = require('../../graphql/schema');
const resolvers = require('../../graphql/resolvers');

describe('GraphQL API Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    app = express();
    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });
  });

  afterAll(async () => {
    await server.stop();
  });

  test('should register a new user', async () => {
    const mutation = `
      mutation {
        register(email: "test@example.com", username: "testuser", password: "password123") {
          user {
            id
            email
            username
          }
          accessToken
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query: mutation });

    expect(response.status).toBe(200);
    expect(response.body.data.register.user.email).toBe('test@example.com');
    expect(response.body.data.register.accessToken).toBeTruthy();
  });

  test('should create an investigation', async () => {
    // First register and login
    const registerResponse = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            register(email: "investigator@example.com", username: "investigator", password: "password123") {
              user { id }
              accessToken
            }
          }
        `,
      });

    const token = registerResponse.body.data.register.accessToken;

    const mutation = `
      mutation {
        createInvestigation(input: {
          title: "Test Investigation"
          description: "A test investigation"
        }) {
          id
          title
          status
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: mutation });

    expect(response.status).toBe(200);
    expect(response.body.data.createInvestigation.title).toBe(
      'Test Investigation',
    );
  });
});
```

## Deployment and Automation

### Automated Setup Script

Save the development automation script and run:

```bash
# Make the script executable
chmod +x intelgraph-automation.sh

# Run the automation
./intelgraph-automation.sh
```

### Manual Next Steps

1. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install Dependencies**

   ```bash
   npm run setup
   ```

3. **Start Development Environment**

   ```bash
   npm run docker:dev
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### GitHub Repository Setup

1. **Create GitHub Issues** from `docs/DEVELOPMENT_TASKS.md`
2. **Set up branch protection** for `main` and `develop`
3. **Configure secrets** for CI/CD:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `NEO4J_PASSWORD`
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`

### Milestone Tracking

**MVP-0 Definition of Done:**

- [ ] User authentication working end-to-end
- [ ] Investigation CRUD operations complete
- [ ] Entity and relationship management functional
- [ ] Basic graph visualization operational
- [ ] Neo4j integration with constraints
- [ ] Docker development environment working
- [ ] CI/CD pipeline functional
- [ ] Basic test coverage >80%

**Success Metrics:**

- All automated tests passing
- Application deployable with single command
- Basic workflow: login → create investigation → add entities → visualize graph
- Code quality gates enforced
- Security scanning enabled

This implementation package provides a complete path from the current repository state to a working MVP-0 version of the IntelGraph platform.
