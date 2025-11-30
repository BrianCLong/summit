# Global Talent Magnet AI Service

AI-powered talent recognition and attraction service for Estonia's digital nation initiative.

## Overview

Recognize global talent signals before competitors, offer instant personalized incentives, onboarding, and upskilling to accelerate Estonia's share of elite innovators.

## Features

- **Talent Signal Detection**: Identify high-potential candidates from GitHub, publications, patents, awards
- **AI Matching Engine**: Score and rank talents against customizable criteria
- **Personalized Incentives**: Generate tailored packages (relocation grants, tax benefits, visa fast-track)
- **Onboarding Plans**: Create customized integration roadmaps with upskilling pathways

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/talents` | GET | Search talents |
| `/api/v1/talents` | POST | Create talent profile |
| `/api/v1/talents/:id` | GET | Get talent by ID |
| `/api/v1/talents/:id` | PATCH | Update talent |
| `/api/v1/talents/match` | POST | Match talents to criteria |
| `/api/v1/talents/:id/signals` | POST | Detect and add signals |
| `/api/v1/talents/:id/incentive` | POST | Generate incentive package |
| `/api/v1/talents/:id/onboarding` | POST | Generate onboarding plan |
| `/api/v1/talents/stats/summary` | GET | Get analytics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TALENT_MAGNET_PORT` | 4050 | Service port |
| `TALENT_MAGNET_HOST` | 0.0.0.0 | Bind host |
| `LOG_LEVEL` | info | Logging level |

## Architecture

```
src/
├── index.ts              # Express server entry
├── routes/talents.ts     # REST API routes
├── services/
│   ├── MatchingEngine.ts     # Talent scoring & ranking
│   ├── IncentiveGenerator.ts # Personalized incentives
│   ├── OnboardingService.ts  # Onboarding plans
│   └── TalentRepository.ts   # Data access layer
├── models/types.ts       # TypeScript types & Zod schemas
└── utils/logger.ts       # Logging utility
```

## Testing

```bash
pnpm test
```
