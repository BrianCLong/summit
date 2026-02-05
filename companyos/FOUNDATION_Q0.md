# CompanyOS Q0 Foundation

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready

## Objective

Establish the CompanyOS baseline with a repeatable golden path, minimal API service, and developer onboarding that aligns with Summit workflows.

## Deliverables

- Golden path commands:
  - `make companyos-bootstrap`
  - `make companyos-up`
  - `make companyos-smoke`
- Smoke check script: `scripts/companyos-smoke.sh`
- Onboarding updated: `companyos/ONBOARDING.md`

## Notes

- Compose entrypoint: `docker-compose.companyos.dev.yml`
- API service template: `companyos/services/api-svc-template`
