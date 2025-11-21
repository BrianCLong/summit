# Synthetic Data Generation Platform

Enterprise-grade synthetic data generation platform with comprehensive privacy-preserving capabilities across all data modalities.

## Features

✨ **Tabular Data Synthesis**
- Statistical methods (Gaussian copula)
- CTGAN (Conditional Tabular GAN)
- TVAE (Tabular Variational Autoencoder)
- Bayesian networks
- Copula-based methods

🔒 **Privacy-Preserving**
- Differential privacy (Laplace, Gaussian mechanisms)
- K-anonymity, L-diversity, T-closeness
- Re-identification risk assessment
- GDPR, HIPAA, CCPA compliance validation
- Privacy budget management

📝 **Text Generation**
- GPT-based text synthesis
- Named entity generation
- Multi-lingual support
- Paraphrasing and back-translation
- Conversational data synthesis

🖼️ **Image & Video**
- StyleGAN, Diffusion models
- Video frame generation
- Comprehensive augmentation
- Resolution upscaling

🎵 **Audio Synthesis**
- Text-to-speech (TTS)
- Voice cloning
- Audio augmentation
- Multi-speaker conversations

🌐 **Graph & Network**
- Erdős-Rényi, Barabási-Albert models
- Community structure preservation
- Temporal graph evolution
- Privacy-preserving graph synthesis

📍 **Geospatial**
- Location trace generation
- POI synthesis
- Geo-indistinguishability
- Mobility patterns

📈 **Time-Series**
- Seasonal pattern preservation
- Trend and cycle modeling
- Anomaly injection
- Multi-variate correlation

🔧 **Data Augmentation**
- Image: rotation, flip, crop, color jitter
- Text: synonym replacement, back-translation
- Audio: pitch shift, time stretch, noise
- AutoAugment and RandAugment

✅ **Quality Assurance**
- Statistical similarity metrics
- Distribution comparison tests
- Correlation analysis
- Automated quality reports

## Quick Start

```typescript
import { TabularSynthesizer } from '@intelgraph/synthetic-data';
import { DifferentialPrivacy } from '@intelgraph/privacy-preserving';

// Generate synthetic tabular data
const synthesizer = new TabularSynthesizer({
  method: 'ctgan',
  numSamples: 1000,
  preserveCorrelations: true,
  privacyBudget: 1.0
});

await synthesizer.fit(originalData);
const result = await synthesizer.generate();

// Assess privacy
const dp = new DifferentialPrivacy({ epsilon: 1.0, mechanism: 'laplace' });
const privatized = dp.privatizeQuery(value, sensitivity);
```

## Installation

```bash
# Install all packages
pnpm install

# Or install specific packages
pnpm add @intelgraph/synthetic-data
pnpm add @intelgraph/privacy-preserving
pnpm add @intelgraph/text-generation
pnpm add @intelgraph/image-synthesis
pnpm add @intelgraph/audio-synthesis
pnpm add @intelgraph/graph-synthesis
pnpm add @intelgraph/geospatial-synthesis
pnpm add @intelgraph/data-augmentation
```

## Packages

| Package | Description |
|---------|-------------|
| `@intelgraph/synthetic-data` | Core tabular and time-series synthesis |
| `@intelgraph/privacy-preserving` | Differential privacy, k-anonymity, validation |
| `@intelgraph/text-generation` | GPT-based text synthesis and NER |
| `@intelgraph/image-synthesis` | Image and video generation |
| `@intelgraph/audio-synthesis` | TTS, voice cloning, audio effects |
| `@intelgraph/graph-synthesis` | Graph and network generation |
| `@intelgraph/geospatial-synthesis` | Location and mobility data |
| `@intelgraph/data-augmentation` | Multi-modal augmentation |

## API Service

Start the unified synthesis API:

```bash
cd services/synthesis-service
pnpm install
pnpm start
```

API runs on `http://localhost:3000`

## Documentation

Full documentation available at:
- [User Guide](./GUIDE.md)
- [API Reference](./API.md)
- [Examples](../../examples/synthetic-data/)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Synthesis Service (REST API)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Tabular    │  │    Text      │  │  Image   │ │
│  │  Synthesis   │  │ Generation   │  │ Synthesis│ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Audio      │  │    Graph     │  │Geospatial│ │
│  │  Synthesis   │  │  Synthesis   │  │ Synthesis│ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│            Privacy-Preserving Layer                 │
│  (Differential Privacy, K-Anonymity, Validation)    │
├─────────────────────────────────────────────────────┤
│              Data Augmentation Layer                │
│     (Image, Text, Audio, Tabular Augmentation)      │
├─────────────────────────────────────────────────────┤
│              Quality Assurance Layer                │
│  (Metrics, Tests, Validation, Reporting)            │
└─────────────────────────────────────────────────────┘
```

## Use Cases

1. **Privacy-Preserving Testing**
   - Generate realistic test data without exposing PII
   - Comply with GDPR, HIPAA, CCPA regulations
   - Safe data sharing with partners

2. **Machine Learning Training**
   - Augment limited training datasets
   - Balance imbalanced classes
   - Create diverse training samples

3. **Data Democratization**
   - Enable safe access to synthetic versions of sensitive data
   - Support research without privacy concerns
   - Facilitate collaboration

4. **Development & Testing**
   - Generate realistic test fixtures
   - Performance testing with large datasets
   - Edge case generation

5. **Research & Analysis**
   - Prototype with synthetic data before accessing real data
   - Validate algorithms on controlled datasets
   - Reproducible research

## Performance

- **Tabular**: 10,000 rows/second (statistical), 1,000 rows/second (CTGAN)
- **Text**: 100 samples/second
- **Image**: 10 images/second (512x512)
- **Graph**: 1,000 nodes/second
- **Geospatial**: 5,000 points/second

## Security

- All synthesis operations are logged
- Privacy budget tracking
- Secure API endpoints with authentication
- Audit trail for compliance

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

Copyright © 2024 IntelGraph. All rights reserved.

## Support

- Documentation: https://docs.intelgraph.com/synthetic-data
- Issues: https://github.com/intelgraph/synthetic-data/issues
- Email: support@intelgraph.com
