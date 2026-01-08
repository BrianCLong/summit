# API Deprecation Policy

This policy defines how we deprecate and remove features, APIs, and configuration options in the IntelGraph platform.

## Principles

1.  **No Surprise Breaks**: Users should be warned before a feature stops working.
2.  **Clear Communication**: Deprecations must be announced in release notes and changelogs.
3.  **Support Window**: Deprecated features are supported for at least **one major release** or **3 months**, whichever is longer.

## Process

### 1. Mark as Deprecated

- **Code**: Use the `@deprecated` JSDoc tag with a message explaining what to use instead.
- **Runtime**: Use the `deprecate()` utility to log a warning when the feature is used.
- **API**: Add `Deprecation` header (draft-ietf-httpapi-deprecation-header) or `X-Deprecated` header.
- **GraphQL**: Use `@deprecated(reason: "...")` directive.

### 2. Announce

- Include in the "Deprecations" section of the Release Notes.
- Notify consumers (if internal).

### 3. Remove

- After the support window expires, the feature can be removed.
- This constitutes a **Breaking Change** and requires a major version bump (SemVer).

## Usage Examples

### TypeScript/JSDoc

```typescript
/**
 * @deprecated Use `newMethod()` instead.
 */
function oldMethod() {
  deprecate("oldMethod is deprecated. Use newMethod instead.");
  // ...
}
```

### GraphQL

```graphql
type User {
  """
  @deprecated Use `fullName` instead.
  """
  name: String @deprecated(reason: "Use fullName instead")
}
```
