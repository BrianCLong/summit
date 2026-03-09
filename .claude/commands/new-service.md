# New Service Command

Scaffold a new microservice for the Summit platform.

## Usage

When the user requests `/new-service <service-name>`, create the following structure:

## Service Directory Structure

```
services/<service-name>/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # Express/Fastify server
│   ├── config.ts          # Configuration
│   ├── routes/
│   │   └── health.ts      # Health endpoints
│   ├── services/
│   │   └── <name>Service.ts
│   └── types/
│       └── index.ts       # Type definitions
├── __tests__/
│   └── <name>.test.ts     # Test file
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Package.json Template

```json
{
  "name": "@intelgraph/<service-name>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "pino": "^8.16.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "tsx": "^4.6.0"
  }
}
```

## Server Template

```typescript
// src/server.ts
import express from 'express';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use('/health', healthRoutes);

  return app;
}

export function startServer() {
  const app = createServer();
  const port = config.port;

  app.listen(port, () => {
    console.log(`[${config.serviceName}] Running on port ${port}`);
  });

  return app;
}
```

## Health Route Template

```typescript
// src/routes/health.ts
import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (req, res) => {
  res.json({ status: 'healthy' });
});

healthRoutes.get('/ready', (req, res) => {
  res.json({ ready: true });
});

healthRoutes.get('/live', (req, res) => {
  res.json({ live: true });
});
```

## Config Template

```typescript
// src/config.ts
export const config = {
  serviceName: '<service-name>',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

## Test Template

```typescript
// __tests__/<service-name>.test.ts
import { createServer } from '../src/server';
import request from 'supertest';

describe('<ServiceName> Service', () => {
  const app = createServer();

  it('should return healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
```

## Dockerfile Template

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## After Creation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Add to docker-compose.dev.yml if needed

3. Add to CI workflow

4. Create initial tests

5. Document in service README
