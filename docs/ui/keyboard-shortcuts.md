# Keyboard Shortcuts & Customization

Summit now provides a comprehensive keyboard shortcut system that covers the high-traffic dashboard
actions while letting analysts tailor the mappings to their workflows. The feature spans the React
client, GraphQL API, and PostgreSQL persistence layer so that shortcuts follow the user between
sessions and devices.

## Default catalogue

Default shortcut metadata lives with the GraphQL server to keep the single source of truth close to
persistence. Each entry declares an `actionId`, `category`, `description`, and the default key list.
Client blueprints mirror the server catalogue so handlers can be registered locally without extra
network calls.

- Server defaults are exported from `server/src/graphql/keyboardShortcuts/defaults.ts`. The list
  includes navigation (`ctrl+1 … ctrl+0`), enterprise operations (`alt` modifiers), and utility
  commands such as quick search and help. 【F:server/src/graphql/keyboardShortcuts/defaults.ts†L1-L75】
- The home route defines matching shortcut blueprints and wires them to tab navigation, search
  focus, and other UI handlers. 【F:client/src/routes/HomeRoute.tsx†L1-L189】

## Loading & persistence flow

1. When an authenticated user visits the dashboard, the client issues the `GetKeyboardShortcuts`
   query. The resolver merges server defaults with any per-user overrides stored in PostgreSQL and
   returns effective keys plus metadata. 【F:client/src/graphql/keyboardShortcuts.gql.ts†L1-L14】【F:server/src/graphql/resolvers/keyboardShortcuts.ts†L1-L83】
2. Updates from the customization modal call `saveKeyboardShortcuts`. The resolver normalizes each
   combo, deduplicates keys, and upserts them into the `user_keyboard_shortcuts` table. 【F:client/src/graphql/keyboardShortcuts.gql.ts†L16-L24】【F:server/src/graphql/resolvers/keyboardShortcuts.ts†L84-L140】【F:server/src/db/repositories/keyboardShortcuts.ts†L1-L39】
3. Users can revert individual actions or the full set through `resetKeyboardShortcuts`, which
   deletes stored overrides for the current user. 【F:client/src/graphql/keyboardShortcuts.gql.ts†L26-L30】【F:server/src/graphql/resolvers/keyboardShortcuts.ts†L141-L178】
4. Overrides persist in PostgreSQL via the migration-defined table. Keys are stored as arrays and
   indexed by user and action to keep lookups fast. 【F:server/db/migrations/postgres/2025-09-06_keyboard_shortcuts.sql†L1-L16】

## Accessible client experience

- The `KeyboardShortcuts` hook listens for normalized combos (e.g., treating `Cmd` as `Ctrl`) and
  allows essential shortcuts like `?` and `Ctrl+/` even when focus is inside an input field. 【F:client/src/components/KeyboardShortcuts.tsx†L1-L108】
- The help dialog is an ARIA-compliant modal: focus is trapped, Escape closes it, and shortcut lists
  are grouped under labeled sections for screen readers. 【F:client/src/components/KeyboardShortcuts.tsx†L210-L314】
- The customization dialog exposes accessible labels, validation messaging, and reset controls that
  respect keyboard interaction patterns. Normalization utilities accept comma-separated combos and
  clean user input before save. 【F:client/src/components/KeyboardShortcuts.tsx†L316-L482】
- Dashboard chrome surfaces a "⌨️ Shortcuts" trigger and toast confirmations for save/reset
  operations. GraphQL mutations reuse the fetched cache for a snappy experience. 【F:client/src/routes/HomeRoute.tsx†L190-L396】

## Testing

Playwright coverage exercises the full customize flow, intercepting GraphQL traffic to assert that
normalized payloads are sent to the server and that confirmation toasts appear. Run the UI project
with the Chromium profile:

```bash
npm --prefix client run test:e2e -- --project=chromium ui/keyboard-shortcuts.spec.ts
```

The test specification lives at `client/tests/e2e/ui/keyboard-shortcuts.spec.ts`. 【F:client/tests/e2e/ui/keyboard-shortcuts.spec.ts†L1-L91】

## Implementation tips

- Extend shortcut coverage by editing the server defaults first, then add handlers to the client
  blueprint array. This keeps action identifiers synchronized across layers.
- Call `resetKeyboardShortcuts` without arguments to restore the entire set or pass `actionIds` to
  reset targeted actions. The resolver ignores empty IDs so you do not need to pre-filter input.
- Because normalization runs on both the client and server, the UI immediately reflects canonical
  formatting (e.g., ordering modifiers as `ctrl+alt+shift`).
