# Cross-Border AI/Virtual Assistant Interoperability

> Bürokratt-style cross-border government virtual assistant network integration

## Overview

This module implements seamless cross-border collaboration between government virtual assistants across partner nations, inspired by Estonia's Bürokratt initiative.

## Features

- **Partner Nation Registry**: Manage trusted government assistant endpoints with trust levels
- **Adaptive Handover Protocol**: Secure session transfer with context preservation
- **Multilingual Bridge**: Real-time translation supporting 24+ EU languages
- **Resilience Patterns**: Circuit breakers, rate limiting, retry with backoff
- **Observability**: Prometheus metrics, comprehensive audit logging
- **GraphQL & REST APIs**: Full API coverage for all operations

## Quick Start

```typescript
import { getCrossBorderGateway } from './cross-border';

// Initialize the gateway
const gateway = getCrossBorderGateway();
await gateway.initialize();

// Create a cross-border session
const session = await gateway.createSession({
  targetNation: 'EE',  // Estonia
  intent: 'tax_inquiry',
  language: 'en',
});

// Send a message with translation
const message = await gateway.sendMessage(session.id, 'What is the tax deadline?', {
  translate: true,
  targetLanguage: 'et',
});
```

## Configuration

Set environment variables to configure the module:

```bash
# Gateway
CROSS_BORDER_NODE_ID=intelgraph-primary
CROSS_BORDER_REGION=US
CROSS_BORDER_DEFAULT_LANG=en
CROSS_BORDER_MAX_SESSIONS=1000

# Security
CROSS_BORDER_ENCRYPTION=true
CROSS_BORDER_AUDIT=true
CROSS_BORDER_MTLS=false

# Handover
CROSS_BORDER_HANDOVER_TIMEOUT=30000
CROSS_BORDER_MAX_RETRIES=3
CROSS_BORDER_CONTEXT_LIMIT=32000
CROSS_BORDER_SESSION_TTL=24

# Rate Limiting
CROSS_BORDER_RATE_LIMIT=100
CROSS_BORDER_BURST_SIZE=20

# Circuit Breaker
CROSS_BORDER_CB_THRESHOLD=5
CROSS_BORDER_CB_RESET=60000
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cross-border/health` | Health check |
| GET | `/cross-border/status` | Detailed status |
| GET | `/cross-border/metrics` | Prometheus metrics |
| GET | `/cross-border/partners` | List all partners |
| GET | `/cross-border/partners/:code` | Get partner details |
| POST | `/cross-border/partners/search` | Search partners |
| POST | `/cross-border/sessions` | Create session |
| GET | `/cross-border/sessions` | List active sessions |
| GET | `/cross-border/sessions/:id` | Get session details |
| POST | `/cross-border/sessions/:id/messages` | Send message |
| POST | `/cross-border/sessions/:id/complete` | Complete session |
| POST | `/cross-border/sessions/:id/handover` | Initiate handover |
| POST | `/cross-border/translate` | Translate text |
| POST | `/cross-border/detect-language` | Detect language |
| GET | `/cross-border/languages` | List supported languages |
| POST | `/cross-border/handover/accept` | Accept incoming handover |
| GET | `/cross-border/audit` | Get audit log |

### GraphQL Operations

```graphql
# Queries
query {
  crossBorderPartners { code name status }
  crossBorderPartner(code: "EE") { ... }
  crossBorderSessions { id state }
  detectLanguage(text: "Tere") { language confidence }
  supportedLanguages
}

# Mutations
mutation {
  createCrossBorderSession(input: {
    targetNation: "EE"
    intent: "inquiry"
    language: "en"
  }) { id }

  sendCrossBorderMessage(input: {
    sessionId: "..."
    content: "Hello"
    translate: true
    targetLanguage: "et"
  }) { id translatedText }
}
```

## Partner Nations

Default partners in the Bürokratt network:

| Code | Name | Languages | Trust Level |
|------|------|-----------|-------------|
| EE | Estonia (Bürokratt) | et, en, ru | 4 |
| FI | Finland (AuroraAI) | fi, sv, en | 4 |
| LV | Latvia | lv, en, ru | 2 |
| LT | Lithuania | lt, en | 2 |

## Trust Levels

| Level | Max Classification | Operations |
|-------|-------------------|------------|
| 1 | Public | query |
| 2 | Internal | query, verify |
| 3 | Confidential | query, verify, submit |
| 4 | Restricted | query, verify, submit, translate |
| 5 | Top Secret | all operations |

## Resilience

### Circuit Breaker

The circuit breaker protects against cascading failures:

- **Closed**: Normal operation
- **Open**: Fails immediately after threshold failures
- **Half-Open**: Allows test requests after reset timeout

### Rate Limiting

Token bucket rate limiting prevents partner endpoint overload:

- Configurable requests per minute
- Burst allowance for traffic spikes
- Per-partner rate limiting

## Metrics

Prometheus metrics available at `/cross-border/metrics`:

```
# Counters
cross_border_handovers_total
cross_border_messages_total
cross_border_translations_total
cross_border_circuit_breaker_trips_total

# Gauges
cross_border_active_sessions
cross_border_active_partners
cross_border_partner_health

# Histograms
cross_border_handover_duration_seconds
cross_border_translation_duration_seconds
cross_border_partner_latency_seconds
```

## Testing

```bash
# Run unit tests
pnpm test -- cross-border

# Run specific test file
pnpm test -- partner-registry.test.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cross-Border Gateway                       │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Partner     │  │   Handover   │  │  Multilingual   │  │
│  │   Registry    │  │   Protocol   │  │    Bridge       │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Circuit     │  │    Rate      │  │    Metrics      │  │
│  │   Breaker     │  │   Limiter    │  │   Collector     │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌──────────┐      ┌──────────┐      ┌──────────┐
     │  Estonia │      │  Finland │      │  Latvia  │
     │ Bürokratt│      │ AuroraAI │      │          │
     └──────────┘      └──────────┘      └──────────┘
```

## License

Part of the Summit/IntelGraph platform.
