# Golden Path: New Endpoint

## Checklist

- [ ] **File Location**: Created in `server/src/routes/<feature>.ts`.
- [ ] **Authentication**: Uses `ensureAuthenticated` middleware (or provides justification for public access).
- [ ] **Authorization**: Checks `req.user.tenantId` for multi-tenancy isolation.
- [ ] **Validation**: Validates input body/query parameters (e.g., using Zod or manual checks).
- [ ] **Audit Logging**: Logs critical actions with `auditContext`.
- [ ] **Observability**: Logs success/failure using the standard `logger`.
- [ ] **Testing**: Includes a corresponding test file in `server/src/routes/__tests__/` or `server/tests/`.
- [ ] **Documentation**: Includes JSDoc comments describing the endpoint.
