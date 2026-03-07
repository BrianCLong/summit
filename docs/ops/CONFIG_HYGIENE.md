# Configuration & Secrets Hygiene

## Overview

Configuration drift and secret leakage are top vectors for post-GA instability and compromise. This document outlines the standards and verification tools used to maintain hygiene.

## 1. Standards

### 1.1 Environment Variables

- **Presence**: All services must have `NODE_ENV` set.
- **Production**: In the GA release, `NODE_ENV` must be strictly `production`.
- **Secrets**: Secrets must be injected via environment variables (e.g., K8s Secrets, Vault), never hardcoded.

### 1.2 "Weak" Secrets

- No default passwords (e.g., "admin", "changeme", "password").
- No placeholder API keys (e.g., "sk*test*...").

## 2. Validation Tool

A script is provided to validate the runtime environment against these standards.

### Usage

```bash
npx tsx server/scripts/validate_config_hygiene.ts
```

### Checks Performed

1.  **Required Variables**: Verifies `NODE_ENV` and other critical keys exist.
2.  **Environment Mode**: Warns if `NODE_ENV` is not `production`.
3.  **Weak Secret Scan**: Scans values of keys containing "secret", "password", etc., against a list of known weak passwords.

## 3. Remediation

If the script fails:

1.  **Missing Var**: Update the deployment manifest (e.g., `docker-compose.yml`, Helm chart).
2.  **Weak Secret**: Rotate the secret immediately in the secrets manager and redeploy.
3.  **Wrong Env**: Adjust the launch configuration.
