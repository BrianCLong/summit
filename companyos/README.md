# CompanyOS – Summit Subsystem

CompanyOS is the policy-governed “company operating system” that runs **inside** the Summit platform.

It follows the same golden path as Summit:

- Top-level: `make bootstrap && make up && make smoke`
- CompanyOS: `make companyos-bootstrap && make companyos-up && make companyos-smoke`

## Layout

- `adr/` – architecture decision records for CompanyOS
- `services/` – runtime services (API, workers, cron)
- `scripts/` – smoke tests and operational utilities

## Golden Path (CompanyOS)

From repo root:

```bash
make companyos-bootstrap
make companyos-up
make companyos-smoke
```

These commands:

* Install deps for `companyos-api`
* Start CompanyOS services in Docker (db + API)
* Run a minimal health-based smoke test

```
