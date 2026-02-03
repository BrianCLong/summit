# FactGov Module

This module implements the government procurement and auditability layer.

## Structure

- `routes/`: API endpoints (Vendors, RFPs, Contracts, Audit Packs)
- `domain/`: Business logic and models
- `policy/`: Access control and governance policies
- `lib/`: Shared utilities and configuration

## Feature Flag

Enable this module by setting `FACTGOV_ENABLED=true` in the environment.
