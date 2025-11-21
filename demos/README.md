# Summit Demo Orchestration

End-to-end demo stories for flagship use cases.

## Use Cases

### 1. Adversarial Misinformation Defense
**Purpose**: Demonstrate multi-modal detection of misinformation across text, images, video, and social media.

**Flow**: Ingest → Multi-Modal Analysis → Detection Dashboard → Copilot Explanation

**Command**: `npm run demo:misinfo` or `summit demo misinfo`

**Duration**: ~5 minutes

**Key Features**:
- Real-time deepfake detection
- Meme manipulation analysis
- Cross-platform narrative tracking
- Evidence-based explanations
- Counter-narrative suggestions (policy-bounded)

### 2. De-escalation Coaching
**Purpose**: Show AI-assisted communication coaching for high-tension customer service scenarios.

**Flow**: Ingest Conversation → Tone Analysis → Rewrite Suggestions → Copilot Guidance

**Command**: `npm run demo:deescalation` or `summit demo deescalation`

**Duration**: ~3 minutes

**Key Features**:
- Multi-dimensional sentiment analysis
- PII auto-redaction
- Toxicity scoring
- Rewrite alternatives
- Context-aware coaching
- Policy-safe suggestions

## Quick Start

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Run demos
npm run demo:misinfo
npm run demo:deescalation

# Or use the CLI
./demos/cli.sh misinfo
./demos/cli.sh deescalation
```

## Architecture

```
demos/
├── misinfo-defense/
│   ├── datasets/         # Curated demo data
│   ├── pipelines/        # Data ingestion
│   ├── ui/              # UI components
│   └── copilot/         # Prompt templates
├── deescalation/
│   ├── datasets/
│   ├── pipelines/
│   ├── ui/
│   └── copilot/
├── orchestration/       # Demo flow controllers
└── scripts/            # Press-ready demo scripts
```

## Safety & Compliance

All demos enforce:
- Authority/License checks
- PII redaction
- Policy boundaries (no harmful content generation)
- Evidence provenance tracking
- Audit logging

## Documentation

- [Adversarial Misinfo Demo Script](./scripts/misinfo-demo-script.md)
- [De-escalation Demo Script](./scripts/deescalation-demo-script.md)
- [Copilot Safety Guidelines](./copilot/SAFETY.md)
