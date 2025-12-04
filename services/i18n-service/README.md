# i18n Service

Backend internationalization service for the IntelGraph platform.

## Features

- **Language Detection**: Automatic language detection for 60+ languages
- **Policy-Aware Translation**: Translation with classification tag enforcement
- **Multi-Provider Support**: Google Translate, DeepL, or mock providers
- **Metrics & Instrumentation**: Prometheus-compatible metrics
- **RESTful API**: Simple HTTP API for translation services
- **Batch Translation**: Efficient batch processing
- **Caching**: Built-in translation caching

## Installation

```bash
cd services/i18n-service
pnpm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3100` |
| `TRANSLATION_PROVIDER` | Provider (mock/google/deepl/local) | `mock` |
| `GOOGLE_TRANSLATE_API_KEY` | Google Translate API key | - |
| `ENABLE_CACHE` | Enable translation caching | `true` |
| `MAX_TEXT_LENGTH` | Maximum text length | `10000` |

## Usage

### Start the Service

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### API Endpoints

#### POST /api/translate

Translate text with policy enforcement.

**Request:**
```json
{
  "text": "Hello, world!",
  "targetLanguage": "fr",
  "sourceLanguage": "en",
  "policy": {
    "allowTranslation": true,
    "classificationTags": ["UNCLASSIFIED"]
  }
}
```

**Response:**
```json
{
  "translatedText": "Bonjour le monde!",
  "sourceLanguage": "en",
  "targetLanguage": "fr",
  "wasTranslated": true,
  "policyResult": {
    "allowed": true
  },
  "provider": "google"
}
```

#### POST /api/detect

Detect language from text.

**Request:**
```json
{
  "text": "Bonjour, comment allez-vous?"
}
```

**Response:**
```json
{
  "language": "fr",
  "confidence": 0.95,
  "alternatives": []
}
```

#### GET /api/metrics

Get service metrics (JSON format).

#### GET /api/metrics/prometheus

Get metrics in Prometheus format.

## Integration

### Copilot Integration

```typescript
import { getCopilotI18nAdapter } from '@intelgraph/i18n-service';

const adapter = getCopilotI18nAdapter();

// Translate user query
const result = await adapter.translateUserQuery({
  content: "Quelle est la météo aujourd'hui?",
  metadata: { userId: 'user123' }
});

console.log(result.translatedContent); // "What is the weather today?"
```

### Ingestion Integration

```typescript
import { getIngestionI18nAdapter } from '@intelgraph/i18n-service';

const adapter = getIngestionI18nAdapter({
  autoDetectLanguage: true,
  autoTranslate: true,
  targetLanguages: ['en', 'fr', 'es']
});

// Process document
const processed = await adapter.processDocument({
  id: 'doc123',
  content: 'Document content...',
  metadata: { classificationTags: ['UNCLASSIFIED'] }
});

console.log(processed.detectedLanguage); // 'en'
console.log(processed.translations); // Map of translations
```

## Translation Policies

Translation policies enforce classification-based rules:

- **UNCLASSIFIED**: Full translation allowed
- **CUI**: Translation allowed, no cross-border transfer
- **SECRET/TOP_SECRET**: Translation not allowed
- **PII/MEDICAL**: Restricted based on privacy requirements

### Custom Policies

```typescript
const customPolicy = {
  allowTranslation: true,
  allowedTargetLanguages: ['en', 'fr', 'de'],
  forbiddenTargetLanguages: ['ru', 'zh'],
  allowCrossBorderTransfer: false,
  classificationTags: ['CUI']
};
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Supported Languages

60+ languages including:
- Western European: English, French, German, Spanish, Italian, Portuguese
- Nordic: Danish, Norwegian, Swedish, Finnish
- Slavic: Polish, Czech, Russian, Ukrainian
- RTL: Arabic, Hebrew, Persian, Urdu
- Asian: Chinese, Japanese, Korean, Vietnamese

## Architecture

```
services/i18n-service/
├── src/
│   ├── api/              # REST API routes
│   ├── lib/              # Core libraries
│   │   ├── language-detector.ts
│   │   ├── translation-service.ts
│   │   ├── translation-provider.ts
│   │   └── metrics.ts
│   ├── config/           # Configuration
│   │   ├── supported-languages.ts
│   │   └── translation-policies.ts
│   ├── integrations/     # Service integrations
│   │   ├── copilot/
│   │   └── ingestion/
│   ├── types/            # TypeScript types
│   └── index.ts          # Entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Metrics

Available metrics:
- `translation_requests_total`: Total translation requests
- `translation_success_total`: Successful translations
- `translation_failures_total`: Failed translations
- `translation_policy_violations_total`: Policy violations
- `translation_language_pairs`: Language pair usage
- `translation_provider_usage`: Provider usage statistics

## License

PROPRIETARY - IntelGraph Team
