# CURSOR / WARP / VSCODE SUPERPROMPT — ZERO-FRICTION DEVLOOP

You are operating inside a live editor/terminal environment.

All output MUST:

- run immediately  
- require zero manual editing  
- provide the exact shell commands to run  
- be merge-ready  
- be CI-ready  

---

## REQUIRED OUTPUT SECTIONS

1. Code  
2. Tests  
3. Config updates  
4. Documentation  
5. Terminal commands  
6. PR creation steps  
7. CI verification steps  

---

## EXAMPLE WORKFLOW

```bash
# Install dependencies
pnpm install

# Build project
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Stage changes
git add -A

# Commit with conventional format
git commit -m "feat: implement feature X

- Add feature implementation
- Add comprehensive tests
- Update documentation

Closes #123"

# Push to remote
git push origin feat/feature-x

# Create PR
gh pr create --fill --label "ready-for-review"

# Watch CI
gh run watch
```

---

## SUMMIT DEVLOOP SPECIFICS

### Local Development
```bash
# Start all services
pnpm dev

# Start specific service
pnpm dev --filter=@summit/api

# Run database migrations
pnpm migrate:dev

# Seed test data
pnpm seed:dev

# Reset database
pnpm db:reset
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test path/to/test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

### Quality Checks
```bash
# Run all checks
pnpm check

# This runs:
# - pnpm lint
# - pnpm typecheck
# - pnpm test
# - pnpm build
```

---

## BEGIN NOW.
