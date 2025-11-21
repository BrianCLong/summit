# AI Marketplace Service

Hyper-Personalized AI Experience Marketplace for Summit/IntelGraph platform.

## Features

- **Preference Learning**: Collaborative filtering and content-based recommendations
- **Multi-Persona Support**: Tailored experiences for citizens, businesses, and developers
- **On-Demand Localization**: 60+ supported locales with RTL support
- **Modular Architecture**: Extensible experience system via extension framework

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## Architecture

```
src/
├── models/           # Type definitions (Zod schemas)
├── services/         # Business logic
│   ├── preference-learning.ts   # User preference tracking
│   └── marketplace-service.ts   # Main marketplace API
├── engines/          # Recommendation algorithms
│   └── personalization-engine.ts
├── graphql/          # GraphQL schema & resolvers
├── localization/     # i18n adapters
└── index.ts          # Public exports
```

## GraphQL API

### Queries

- `marketplaceRecommendations` - Get personalized recommendations
- `marketplaceBrowse` - Browse with filters
- `marketplaceExperience(id)` - Get experience details
- `marketplaceInstalled` - List installed experiences
- `marketplacePreferences` - Get user preferences

### Mutations

- `marketplaceInstall(experienceId)` - Install experience
- `marketplaceUninstall(experienceId)` - Uninstall experience
- `marketplaceRate(experienceId, rating)` - Rate experience
- `marketplaceUpdatePreferences(input)` - Update preferences
- `marketplacePublish(input)` - Publish new experience

## Personas

| Persona     | Focus Areas                              |
|-------------|------------------------------------------|
| `citizen`   | Public services, healthcare, utilities   |
| `business`  | Analytics, compliance, operations        |
| `developer` | Code tools, APIs, integrations           |

## License

Proprietary - Summit/IntelGraph Platform
