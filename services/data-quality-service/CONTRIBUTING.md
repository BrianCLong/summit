# Contributing to Data Quality Service

Thank you for your interest in contributing to the Data Quality Service!

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or pnpm

### Getting Started

1. Clone the repository and navigate to the service directory:
   ```bash
   cd services/data-quality-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. Start PostgreSQL (if using Docker):
   ```bash
   docker-compose up -d postgres
   ```

5. Run the service in development mode:
   ```bash
   npm run dev
   ```

6. Access the service:
   - API: http://localhost:3000/api/v1
   - Health: http://localhost:3000/health
   - Swagger: http://localhost:3000/api-docs

## Development Workflow

### Code Quality

Before submitting changes:

1. Run TypeScript type checking:
   ```bash
   npm run typecheck
   ```

2. Run linter:
   ```bash
   npm run lint
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Check test coverage:
   ```bash
   npm test -- --coverage
   ```

### Code Style

- Use TypeScript with strict mode enabled
- Follow existing code patterns and naming conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use async/await instead of callbacks
- Prefer functional programming patterns

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(validation): add uniqueness constraint checking
fix(profiling): handle null values in distribution
docs(api): update swagger documentation
```

## Adding New Features

### Adding a New Route

1. Create the route file in `src/routes/`
2. Implement route handlers with proper validation
3. Add Swagger/JSDoc documentation
4. Export the router creation function
5. Register the router in `src/server.ts`
6. Add tests in `src/__tests__/`

Example:

```typescript
// src/routes/example.ts
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Pool } from 'pg';
import { asyncHandler, BadRequestError } from '../middleware/error-handler.js';

export function createExampleRouter(pool: Pool): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/example:
   *   get:
   *     summary: Example endpoint
   *     tags: [Example]
   *     responses:
   *       200:
   *         description: Success
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      res.json({ status: 'success', data: {} });
    })
  );

  return router;
}
```

### Adding Middleware

1. Create middleware file in `src/middleware/`
2. Export middleware function
3. Add to Express app in `src/server.ts`
4. Add tests

### Adding Configuration

1. Add configuration schema to `src/config.ts`
2. Add environment variable to `.env.example`
3. Document in README.md

## Testing

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:

```typescript
describe('QualityRouter', () => {
  describe('POST /assess', () => {
    it('should assess data quality successfully', async () => {
      // Arrange
      const mockData = { tableName: 'test', rules: [] };

      // Act
      const response = await request(app)
        .post('/api/v1/quality/assess')
        .send(mockData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
```

### Integration Tests

- Test complete request/response flows
- Use test database
- Clean up after tests

## Documentation

### API Documentation

- Add Swagger/OpenAPI annotations to all routes
- Include request/response examples
- Document error responses
- Keep README.md up to date

### Code Documentation

- Add JSDoc comments for public functions
- Document complex algorithms
- Explain non-obvious code
- Include usage examples

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the guidelines above

3. Run all checks:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

4. Commit your changes with conventional commits

5. Push to your fork and create a pull request

6. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Testing performed
   - Breaking changes (if any)

7. Wait for review and address feedback

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Build and push Docker image
5. Deploy to staging
6. Run smoke tests
7. Deploy to production

## Questions?

- Open an issue for bugs or feature requests
- Join our Slack channel for discussions
- Email: dev@summit.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
