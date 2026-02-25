This PR hardens the core input sanitization middleware in the server workspace. The previous implementation was vulnerable to Prototype Pollution and property injection via inheritance. Additionally, it lacked XSS protection and corrupted special object types like Date and Buffer.

## Assumption Ledger
- Core API routes use the sanitization middleware for all incoming requests.
- `html-escaper` is reliable for preventing XSS in standard HTML contexts.
- Copy-on-Write implementation correctly identifies objects that need sanitization without corrupting instances of Date/Buffer.

## Diff Budget
- The primary security fix in `sanitization.ts` is < 50 lines.
- Supporting tests and CI remediations are kept minimal.

## Success Criteria
- NoSQL injection keys ($ and .) are stripped from request objects.
- Prototype Pollution attempts are blocked.
- HTML special characters are escaped in user input.
- Special object types (Date, Buffer, etc.) are preserved.
- CI environment blockers (version mismatches, path errors) are resolved.

## Evidence Summary
- New unit tests pass in `server/src/middleware/__tests__/sanitization.test.ts`.
- Local build of server succeeds.
- CI environment stabilized with standardized versions and Node/pnpm upgrades.

<!-- AGENT-METADATA:START -->
{
  "promptId": "sentinel-security-fix",
  "taskId": "10318788485613945165",
  "tags": ["security", "hardening", "ci-remediation"]
}
<!-- AGENT-METADATA:END -->
