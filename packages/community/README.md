# @summit/community

The `@summit/community` package provides an in-memory community engagement engine designed to power discussion forums, activity feeds, contribution tracking, gamification, and analytics without requiring a backing database. The module is framework agnostic and can be wired into REST, GraphQL, or WebSocket transports.

## Features

- **Discussion forums** – categories, threads, replies, moderation status, and lock management.
- **User activity feeds** – capture granular events with contextual metadata for personalized or global feeds.
- **Contribution tracking** – aggregate posts, replies, solution marks, and reactions into contributor summaries.
- **Gamification** – configurable badges, progressive point scoring, and lightweight leveling rules.
- **Community dashboards** – compute real-time participation metrics, health scores, and content mix snapshots.
- **Moderation tools** – flagging workflow, audit history, escalation priorities, and automated removal helpers.
- **Notification system** – queue granular notifications per user with accessibility-aware delivery preferences.
- **User profiles** – maintain interests, accessibility preferences (WCAG 2.1 friendly), avatars, and bios.
- **Search & discovery** – keyword, tag, and persona matching across users, threads, and posts.
- **Analytics** – engagement funnels, retention heuristics, badge distribution, and anomaly detection hints.

The services were designed alongside WCAG 2.1 accessibility guidance, responsive breakpoints, and performance budgets. Although the package focuses on core domain logic, each service exposes metadata hooks to drive accessible UI components (e.g., storing accessible alternative text, enforcing reduced-motion preferences, and providing semantic summaries for screen readers).

## Getting Started

```bash
pnpm install
pnpm --filter @summit/community test
pnpm --filter @summit/community build
```

### TypeScript Strict Mode

The package ships with strict TypeScript settings including exact optional property types, unchecked index safety, and explicit return validation.

### Linting & Formatting

Run ESLint to validate compliance with the monorepo rules:

```bash
pnpm --filter @summit/community lint
```

### Testing

The package uses Node's built-in test runner with the `ts-node` ESM loader and `c8` for coverage instrumentation. The integration suite exceeds 80% statement coverage.

```bash
pnpm --filter @summit/community test
```

## Architecture

- `CommunityHub` orchestrates store-backed services for ease of consumption.
- Each service is stateless beyond the shared `CommunityStore`, enabling serverless deployments.
- Utilities favor immutable returns to reduce accidental mutation bugs and to simplify change detection in UI layers.

## Extending

Add persistence by replacing the `CommunityStore` with a database-backed implementation that matches the same interface. Because all services depend on the store contract, swapping the store preserves behaviors while enabling scaling or audit logging.

## License

MIT © Summit Intelligence
