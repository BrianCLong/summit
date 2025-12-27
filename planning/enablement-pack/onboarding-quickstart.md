# Onboarding & Quickstart (ADOPT-1)

This guide provides the **Golden Path** to get your local development environment set up and running.

## Known Issues & Mitigations

Before you start, review the onboarding pitfalls and fixes in
[`docs/onboarding/known-issues.md`](../../docs/onboarding/known-issues.md).

## 1. Prerequisites

Ensure you have the following installed:

- **Node.js**: v20+ (Check `package.json` engines or `Makefile`)
- **pnpm**: v9.12.0+ (We use `pnpm` exclusively)
- **Docker & Docker Compose**: For running backing services (Postgres, Neo4j, Redis).
- **Git**: For version control.
- **VS Code** (Recommended): With ESLint and Prettier extensions.

## 2. Setup Repository

Clone the repository and install dependencies:

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
pnpm install
```

## 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Review `.env` and adjust if necessary. The defaults are usually sufficient for local development.

## 4. Start the System (Golden Path)

The most reliable way to start the entire stack (services + databases) is using Docker Compose for infrastructure and running the apps locally or via Docker.

### Option A: Full Docker (Recommended for first run)

```bash
pnpm run docker:dev
```

This will start all services defined in `docker-compose.dev.yml`.

### Option B: Local Apps + Docker Infra

If you prefer running Node processes locally for faster iteration:

1.  **Start Infrastructure (DBs)**:

    ```bash
    pnpm run docker:dev up -d postgres neo4j redis
    ```

    _(Note: Adjust service names based on actual docker-compose file if needed)_

2.  **Run Migrations**:

    ```bash
    pnpm run db:migrate
    pnpm run db:seed
    ```

3.  **Start Apps**:
    ```bash
    pnpm run dev
    ```
    This uses `turbo` to run client and server in parallel.

## 5. Verification

Once running, verify the services are accessible:

- **Web Client**: [http://localhost:3000](http://localhost:3000)
- **Server API**: [http://localhost:4000/graphql](http://localhost:4000/graphql) (or similar port)

## 6. First Safe Change

To verify your workflow:

1.  Create a new branch: `git checkout -b chore/verify-setup`
2.  Make a trivial change (e.g., add a log line in `server/src/index.ts` or a comment).
3.  Run lint and tests:
    ```bash
    pnpm run lint
    pnpm run test:quick
    ```
4.  If green, you are ready to code!
