# CompanyOS – 15-Minute Quickstart

1. Clone & enter repo
   ```bash
   git clone https://github.com/BrianCLong/summit.git
   cd summit
   ```

2. Bootstrap dependencies

   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   ```

3. Start CompanyOS stack

   ```bash
   docker compose -f docker-compose.companyos.dev.yml up -d
   ```

4. Seed data

   ```bash
   pnpm --filter api-svc-template seed
   ```

5. Run tests

   ```bash
   pnpm --filter api-svc-template test
   ```

You’re successful when:

- `http://localhost:4100/health` returns 200.
- `pnpm --filter api-svc-template test` exits 0.
