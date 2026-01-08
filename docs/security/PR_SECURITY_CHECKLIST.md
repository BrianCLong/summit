## Security Review Checklist

- [ ] **Authentication**: Verify that new endpoints are authenticated.
- [ ] **Authorization**: Verify that the user has the correct permissions (RBAC/ABAC).
- [ ] **Input Validation**: Ensure all inputs are validated using Zod/Joi.
- [ ] **Output Encoding**: Ensure no raw HTML is rendered from user input (XSS).
- [ ] **Secrets**: Ensure no secrets are committed or logged.
- [ ] **Logging**: Ensure no sensitive PII is logged.

<!-- If DB files changed -->

### Database Changes

- [ ] **Migrations**: Review migration scripts for data loss risks.
- [ ] **Injection**: Ensure all queries use parameterized inputs (no string concatenation).
- [ ] **Indexing**: Verify indices for performance (DoS prevention).

<!-- If Frontend files changed -->

### Frontend Changes

- [ ] **XSS**: Verify usage of `dangerouslySetInnerHTML` is justified and sanitized.
- [ ] **Dependencies**: Check for new npm packages.
- [ ] **State**: Ensure sensitive data is not stored in LocalStorage.
