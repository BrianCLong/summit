# Release Notes RC1

## Breaking Changes
- All write mutations now require tenant context via `@tenantScoped`

## Migration
- Update clients to pass tenantId in auth context
- Review retention policies in `config/retention/policies.yaml`
