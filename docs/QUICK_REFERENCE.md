# Quick Reference Guide - Summit/IntelGraph

> **Purpose**: Fast access to common commands, patterns, and solutions
> **Last Updated**: 2025-11-20

## Essential Commands

### Setup & Start

```bash
# One-time setup
make bootstrap              # Install deps, create .env

# Daily workflow
make up                     # Start all services
make down                   # Stop all services
make logs                   # View logs
make smoke                  # Run golden path tests

# Full reset (if things break)
make down
docker system prune -af --volumes
make bootstrap
make up
```

### Development

```bash
# Run dev servers
pnpm dev                    # All packages in parallel
pnpm server:dev             # API server only
pnpm client:dev             # Frontend only

# Testing
pnpm test                   # All tests
pnpm test -- path/to/test   # Specific test
pnpm test:coverage          # With coverage
pnpm e2e                    # Playwright E2E tests

# Code quality
pnpm lint                   # Lint code
pnpm lint -- --fix          # Auto-fix
pnpm typecheck              # Type checking
pnpm format                 # Format code

# Build
pnpm build                  # Build all packages
pnpm build --filter=pkg     # Build specific package
```

### Database

```bash
# PostgreSQL
pnpm db:pg:migrate          # Run migrations
pnpm db:pg:status           # Check status
pnpm db:pg:generate         # Generate Prisma client

# Neo4j
pnpm db:neo4j:migrate       # Run migrations

# Knex
pnpm db:knex:migrate        # Run migrations
pnpm db:knex:rollback       # Rollback last batch
```

### Git

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit (follows conventional commits)
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update readme"

# Push and create PR
git push -u origin feature/my-feature
# Then create PR on GitHub

# Update branch
git fetch origin main
git rebase origin/main
# Or
git merge origin/main
```

---

## Project Structure

```
summit/
├── apps/                   # Application entry points
│   ├── server/            # Main API server
│   └── web/               # React web app
├── packages/              # Shared libraries
│   ├── blueprints/        # Shared components
│   └── adc/               # Data contracts
├── services/              # Microservices
│   ├── api/               # GraphQL API
│   ├── copilot/           # AI copilot
│   └── policy/            # OPA policy engine
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── tests/                 # Cross-cutting tests
└── .github/               # CI/CD workflows
```

---

## Common Tasks

### Add a New Package

```bash
# Create package
mkdir -p packages/my-package/src
cd packages/my-package
pnpm init

# Add dependencies
pnpm add <package-name>

# Build
pnpm build
```

### Add a New Service

```bash
# Create service
mkdir -p services/my-service/src
cd services/my-service

# Create package.json
{
  "name": "@intelgraph/my-service",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "jest"
  }
}

# Add to docker-compose.dev.yml if needed
```

### Update GraphQL Schema

```bash
# 1. Edit schema
vim packages/graphql/schema.graphql

# 2. Generate types
pnpm graphql:codegen

# 3. Update persisted queries
pnpm persisted:build
pnpm persisted:check

# 4. Test
pnpm test
```

### Run CI Locally

```bash
# Full CI suite
pnpm ci

# Or step by step
pnpm lint
pnpm typecheck
pnpm build
pnpm test
make smoke
```

---

## Debugging

### View Service Logs

```bash
# All services
make logs

# Specific service
docker compose logs -f neo4j
docker compose logs -f postgres
docker compose logs -f server

# Last N lines
docker compose logs --tail=100 server
```

### Check Service Health

```bash
# API health
curl http://localhost:4000/health
curl http://localhost:4000/health/ready
curl http://localhost:4000/health/live

# Service status
docker compose ps

# Detailed health
curl http://localhost:4000/health/detailed | jq
```

### Access Service Shells

```bash
# API server
docker exec -it summit-server-1 sh

# Neo4j cypher shell
docker exec -it summit-neo4j-1 cypher-shell -u neo4j -p devpassword

# PostgreSQL
docker exec -it summit-postgres-1 psql -U summit -d summit
```

### Debug Tests

```bash
# Run specific test
pnpm test -- path/to/test.test.ts

# Run with verbose output
pnpm test -- --verbose

# Debug in VS Code
# Set breakpoint, press F5, select "Debug Jest Tests"

# Check for open handles
pnpm test -- --detectOpenHandles

# Run in band (no parallel)
pnpm test -- --runInBand
```

---

## TypeScript Patterns

### Define Types

```typescript
// Interface for objects
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Type for unions
type UserRole = 'admin' | 'user' | 'guest';

// Generic type
type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

### Error Handling

```typescript
// Always handle errors
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw new CustomError('Friendly message', { cause: error });
}

// Use Result types
async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: 'Database error' };
  }
}
```

### GraphQL Resolvers

```typescript
// Standard resolver pattern
export const resolvers = {
  Query: {
    user: async (_parent, { id }, context) => {
      // 1. Check authorization
      await context.authorize('user:read', id);
      
      // 2. Fetch data
      const user = await context.dataSources.users.findById(id);
      
      // 3. Return or throw
      if (!user) {
        throw new NotFoundError(`User ${id} not found`);
      }
      
      return user;
    },
  },
  
  Mutation: {
    updateUser: async (_parent, { id, input }, context) => {
      // 1. Authorize
      await context.authorize('user:update', id);
      
      // 2. Validate
      const validation = validateUserInput(input);
      if (!validation.success) {
        throw new ValidationError(validation.errors);
      }
      
      // 3. Update
      const user = await context.dataSources.users.update(id, input);
      
      // 4. Audit log
      await context.auditLog.log('user_updated', { id, input });
      
      return user;
    },
  },
};
```

---

## Testing Patterns

### Unit Test Structure

```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<Database>;
  
  beforeEach(() => {
    mockDb = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    
    userService = new UserService(mockDb);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = userFactory();
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const result = await userService.findById(mockUser.id);
      
      expect(result).toEqual(mockUser);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });
    });
    
    it('should return null when not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      
      const result = await userService.findById('invalid-id');
      
      expect(result).toBeNull();
    });
    
    it('should throw error on database failure', async () => {
      mockDb.user.findUnique.mockRejectedValue(new Error('DB error'));
      
      await expect(
        userService.findById('id')
      ).rejects.toThrow('DB error');
    });
  });
});
```

### Integration Test

```typescript
describe('User API Integration', () => {
  let app: Express;
  let db: Database;
  let testUser: User;
  
  beforeAll(async () => {
    // Setup test database
    db = await setupTestDatabase();
    app = createApp(db);
  });
  
  afterAll(async () => {
    await teardownTestDatabase(db);
  });
  
  beforeEach(async () => {
    testUser = await db.user.create(userFactory());
  });
  
  afterEach(async () => {
    await db.user.deleteMany();
  });
  
  it('should get user by id', async () => {
    const response = await request(app)
      .get(`/api/users/${testUser.id}`)
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    
    expect(response.body).toMatchObject({
      id: testUser.id,
      name: testUser.name,
    });
  });
});
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/summit
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=devpassword
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=4000
CLIENT_PORT=3000

# Security
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production

# Features
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_INTROSPECTION=true
```

### Check Variables

```bash
# Verify env loaded
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"

# List all variables
cat .env | grep -v '^#' | grep -v '^$'
```

---

## Docker Commands

```bash
# View running containers
docker compose ps

# Start specific service
docker compose up neo4j

# Restart service
docker compose restart server

# View resource usage
docker stats

# Clean everything
docker system prune -af --volumes

# Build without cache
docker compose build --no-cache

# Follow logs
docker compose logs -f --tail=100 server
```

---

## Common Error Solutions

### `ECONNREFUSED`
→ Service not running. Check `docker compose ps`

### `Port already in use`
→ Kill process: `kill -9 $(lsof -ti:PORT)`

### `Cannot find module`
→ Run `pnpm install`

### `JavaScript heap out of memory`
→ `export NODE_OPTIONS="--max-old-space-size=8192"`

### `permission denied`
→ `chmod +x script.sh`

### `docker daemon not running`
→ Start Docker Desktop

### `gitleaks detected secrets`
→ Remove secrets or add to `.gitleaksignore`

### `CI checks failing`
→ Run `pnpm ci` locally to reproduce

---

## Port Reference

| Port | Service              |
|------|----------------------|
| 3000 | Frontend (React)     |
| 4000 | API Server           |
| 5432 | PostgreSQL           |
| 6379 | Redis                |
| 7474 | Neo4j HTTP           |
| 7687 | Neo4j Bolt           |
| 8080 | Adminer (DB Admin)   |
| 9090 | Prometheus           |
| 3001 | Grafana              |

---

## Keyboard Shortcuts (VS Code)

```
Cmd/Ctrl + P          - Quick file open
Cmd/Ctrl + Shift + P  - Command palette
Cmd/Ctrl + `          - Toggle terminal
Cmd/Ctrl + B          - Toggle sidebar
Cmd/Ctrl + Shift + F  - Search in files
F5                    - Start debugging
Shift + F5            - Stop debugging
F12                   - Go to definition
Cmd/Ctrl + .          - Quick fix
```

---

## Useful Links

### Local Services
- Frontend: http://localhost:3000
- GraphQL Playground: http://localhost:4000/graphql
- Neo4j Browser: http://localhost:7474
- Adminer: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

### Documentation
- [CLAUDE.md](../CLAUDE.md) - Complete reference
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - Setup guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [CODE_REVIEW_GUIDELINES.md](./CODE_REVIEW_GUIDELINES.md) - Review standards
- [CONTRIBUTION_WORKFLOWS.md](./CONTRIBUTION_WORKFLOWS.md) - Visual workflows

---

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance
- `test`: Tests
- `chore`: Maintenance
- `ci`: CI/CD
- `build`: Build system

**Examples:**
```bash
git commit -m "feat(api): add user search endpoint"
git commit -m "fix(graph): resolve neo4j connection timeout"
git commit -m "docs(readme): update quickstart instructions"
```

---

## Need Help?

1. **Check docs**: `docs/` directory
2. **Search issues**: GitHub Issues
3. **Ask team**: #engineering channel
4. **Create issue**: Use issue template

---

**Pro Tip**: Bookmark this page for quick access! 🚀
