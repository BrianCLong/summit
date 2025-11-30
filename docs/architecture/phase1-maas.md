# Multi-Tenant MaaS v1 Architecture

## Overview
Manages tenant identity, onboarding, and isolation. It acts as the gatekeeper for new organizations entering the platform.

## Workflow

1. **Tenant Creation Request**: API call with name, region, modules.
2. **Governance Check**: Validates the request against 'analytics' or other approved categories.
3. **Registration**: Creates `Tenant` entity in Registry.
4. **Graph Projection**: Creates `Tenant` node in IntelGraph.
5. **Onboarding Task**: Triggers Maestro `TENANT_ONBOARDING` task to provision resources.

## Isolation
All downstream operations (Maestro Tasks, IntelGraph queries) require `tenantId`.
