# CompanyOS – 15-Minute Quickstart

1. Clone & enter repo
   ```bash
   git clone https://github.com/BrianCLong/summit.git
   cd summit
   ```

2. Bootstrap dependencies

   ```bash
   corepack enable
   make companyos-bootstrap
   ```

3. Start CompanyOS stack

   ```bash
   make companyos-up
   ```

4. Seed data

   ```bash
   pnpm --filter api-svc-template seed
   ```

5. Run tests

   ```bash
   pnpm --filter api-svc-template test
   ```

6. Smoke check

   ```bash
   make companyos-smoke
   ```

You’re successful when:

- `http://localhost:4100/health` returns 200.
- `pnpm --filter api-svc-template test` exits 0.
