# Error Codes Reference

This document is auto-generated from `server/src/errors/catalog.ts`. Do not edit manually.

| Code | Status | Message | Remediation | Category |
|------|--------|---------|-------------|----------|
| E1001 | 401 | Invalid authentication token provided. | Please refresh your token or log in again. | Security |
| E1002 | 401 | Authentication token has expired. | Obtain a new token via the refresh endpoint. | Security |
| E1003 | 403 | Insufficient permissions to perform this action. | Contact your administrator to request access. | Security |
| E2001 | 400 | The provided input is invalid. | Check the input parameters and try again. | Validation |
| E3001 | 404 | The requested resource was not found. | Verify the resource ID and ensure it exists. | Resource |
| E9001 | 500 | An internal server error occurred. | Please try again later or contact support. | System |
