# Synthetic Data Generation Platform Guide

## Overview

The IntelGraph Synthetic Data Generation Platform provides comprehensive capabilities for creating realistic test data, privacy-preserving datasets, data augmentation, and model training without exposing sensitive information.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tabular Data Synthesis](#tabular-data-synthesis)
3. [Privacy-Preserving Synthesis](#privacy-preserving-synthesis)
4. [Text Generation](#text-generation)
5. [Image & Video Synthesis](#image--video-synthesis)
6. [Audio Synthesis](#audio-synthesis)
7. [Graph & Network Synthesis](#graph--network-synthesis)
8. [Geospatial Data Synthesis](#geospatial-data-synthesis)
9. [Time-Series Synthesis](#time-series-synthesis)
10. [Data Augmentation](#data-augmentation)
11. [Quality Assurance](#quality-assurance)
12. [API Reference](#api-reference)

## Getting Started

### Installation

```bash
# Install all synthetic data packages
pnpm install @intelgraph/synthetic-data
pnpm install @intelgraph/privacy-preserving
pnpm install @intelgraph/text-generation
pnpm install @intelgraph/image-synthesis
pnpm install @intelgraph/audio-synthesis
pnpm install @intelgraph/graph-synthesis
pnpm install @intelgraph/geospatial-synthesis
pnpm install @intelgraph/data-augmentation
```

### Quick Start

```typescript
import { TabularSynthesizer } from '@intelgraph/synthetic-data';

// Configure synthesizer
const synthesizer = new TabularSynthesizer({
  method: 'statistical',
  numSamples: 1000,
  preserveCorrelations: true,
  preserveDistributions: true
});

// Fit on original data
await synthesizer.fit(originalData);

// Generate synthetic data
const result = await synthesizer.generate();

console.log('Quality Metrics:', result.quality);
console.log('Synthetic Data:', result.syntheticData);
```

## Tabular Data Synthesis

### Supported Methods

- **Statistical**: Gaussian copula-based synthesis
- **CTGAN**: Conditional Tabular GAN
- **TVAE**: Tabular Variational Autoencoder
- **Copula**: Copula-based methods
- **Bayesian**: Bayesian network synthesis

### Example: CTGAN Synthesis

```typescript
import { TabularSynthesizer } from '@intelgraph/synthetic-data';

const synthesizer = new TabularSynthesizer({
  method: 'ctgan',
  numSamples: 5000,
  preserveCorrelations: true,
  categoricalColumns: ['category', 'status'],
  numericalColumns: ['age', 'income', 'score']
});

await synthesizer.fit(trainingData);
const result = await synthesizer.generate();
```

### Data Profiling

```typescript
import { DataProfiler } from '@intelgraph/synthetic-data';

const profile = DataProfiler.profile(data);

console.log('Rows:', profile.numRows);
console.log('Columns:', profile.numColumns);
console.log('Quality Score:', profile.quality.overallScore);
console.log('Column Profiles:', profile.columns);
```

## Privacy-Preserving Synthesis

### Differential Privacy

```typescript
import { DifferentialPrivacy } from '@intelgraph/privacy-preserving';

const dp = new DifferentialPrivacy({
  epsilon: 1.0,
  delta: 1e-5,
  mechanism: 'laplace'
});

// Privatize a query result
const privatized = dp.privatizeQuery(originalValue, sensitivity);

// Check privacy budget
const budget = dp.getBudgetStatus();
console.log('Remaining budget:', budget.remaining);
```

### K-Anonymity

```typescript
import { KAnonymity } from '@intelgraph/privacy-preserving';

const kAnon = new KAnonymity({
  k: 5,
  l: 3, // l-diversity
  t: 0.2, // t-closeness
  quasiIdentifiers: ['age', 'zipcode', 'gender'],
  sensitiveAttributes: ['diagnosis', 'salary']
});

const result = kAnon.anonymize(data);

console.log('Achieved k-anonymity:', result.metrics.kAnonymity);
console.log('L-diversity:', result.metrics.lDiversity);
console.log('Warnings:', result.warnings);
```

### Privacy Assessment

```typescript
import { PrivacyValidator } from '@intelgraph/privacy-preserving';

const assessment = PrivacyValidator.assessPrivacy(originalData, syntheticData, {
  quasiIdentifiers: ['age', 'location'],
  sensitiveAttributes: ['medical_condition'],
  privacyBudget: 1.0
});

console.log('Overall Risk:', assessment.overallRisk);
console.log('GDPR Compliant:', assessment.compliance.gdpr);
console.log('HIPAA Compliant:', assessment.compliance.hipaa);
console.log('Recommendations:', assessment.recommendations);
```

## Text Generation

### GPT-based Text Synthesis

```typescript
import { TextSynthesizer } from '@intelgraph/text-generation';

const synthesizer = new TextSynthesizer({
  model: 'gpt',
  domain: 'medical',
  temperature: 0.8,
  maxLength: 200,
  preserveStyle: true,
  language: 'en'
});

// Fit on training texts
await synthesizer.fit(trainingTexts);

// Generate synthetic text
const samples = await synthesizer.generate(100, 'Medical report:');
```

### Named Entity Generation

```typescript
import { NamedEntityGenerator } from '@intelgraph/text-generation';

const generator = new NamedEntityGenerator();

const person = generator.generatePerson(); // "John Smith"
const org = generator.generateOrganization(); // "TechCorp"
const location = generator.generateLocation(); // "New York"
const date = generator.generateDate(); // Date object
const money = generator.generateMoney(1000, 50000); // "$25,000"
```

### Paraphrasing

```typescript
const paraphrases = await synthesizer.paraphrase(
  'The patient shows signs of improvement.',
  3
);

console.log(paraphrases);
// [
//   "The patient demonstrates improvement.",
//   "Signs of improvement are evident in the patient.",
//   "Improvement is shown by the patient."
// ]
```

### Conversational Data

```typescript
const conversation = await synthesizer.generateConversation(
  10, // number of turns
  ['User', 'Assistant']
);

console.log(conversation.turns);
```

## Image & Video Synthesis

### Image Generation

```typescript
import { ImageSynthesizer } from '@intelgraph/image-synthesis';

const synthesizer = new ImageSynthesizer({
  model: 'diffusion',
  resolution: [512, 512],
  style: 'photorealistic',
  seed: 42
});

const images = await synthesizer.generate(10);
```

### Video Synthesis

```typescript
import { VideoSynthesizer } from '@intelgraph/image-synthesis';

const videoSyn = new VideoSynthesizer();
const frames = await videoSyn.generateVideo(
  300, // frames
  30   // fps
);
```

### Image Augmentation

```typescript
const transforms = ['rotate', 'flip', 'crop', 'brightness'];
const augmented = await synthesizer.augment(image, transforms);
```

## Audio Synthesis

### Text-to-Speech

```typescript
import { TTSSynthesizer } from '@intelgraph/audio-synthesis';

const tts = new TTSSynthesizer();
const audio = await tts.synthesize('Hello, world!', 'default');

console.log('Duration:', audio.duration);
console.log('Sample Rate:', audio.sampleRate);
```

### Voice Cloning

```typescript
import { VoiceCloner } from '@intelgraph/audio-synthesis';

const cloner = new VoiceCloner();
const clonedAudio = await cloner.cloneVoice(referenceAudio, 'New text to synthesize');
```

### Audio Augmentation

```typescript
import { AudioAugmentor } from '@intelgraph/audio-synthesis';

const augmentor = new AudioAugmentor();

const pitched = augmentor.pitchShift(audio, 2); // +2 semitones
const stretched = augmentor.timeStretch(audio, 1.2); // 20% slower
const noisy = augmentor.addNoise(audio, 0.05); // Add 5% noise
```

## Graph & Network Synthesis

### Graph Generation Models

```typescript
import { GraphSynthesizer } from '@intelgraph/graph-synthesis';

// Erdős-Rényi random graph
const erSyn = new GraphSynthesizer({
  model: 'erdos-renyi',
  numNodes: 1000,
  avgDegree: 6
});

const graph = await erSyn.generate();

// Barabási-Albert (scale-free)
const baSyn = new GraphSynthesizer({
  model: 'barabasi-albert',
  numNodes: 1000,
  avgDegree: 4
});

// Watts-Strogatz (small-world)
const wsSyn = new GraphSynthesizer({
  model: 'watts-strogatz',
  numNodes: 1000,
  avgDegree: 6
});

// Community structure
const commSyn = new GraphSynthesizer({
  model: 'community',
  numNodes: 1000
});
```

### Temporal Graphs

```typescript
import { TemporalGraphSynthesizer } from '@intelgraph/graph-synthesis';

const tempSyn = new TemporalGraphSynthesizer();
const graphs = await tempSyn.generateTemporalGraph(10, {
  model: 'barabasi-albert',
  numNodes: 100,
  avgDegree: 4
});
```

## Geospatial Data Synthesis

### Location Traces

```typescript
import { GeospatialSynthesizer } from '@intelgraph/geospatial-synthesis';

const geoSyn = new GeospatialSynthesizer({
  bounds: {
    minLat: 37.7,
    maxLat: 37.8,
    minLon: -122.5,
    maxLon: -122.4
  },
  privacyRadius: 100 // meters
});

const traces = geoSyn.generateTraces(50, 100); // 50 traces, 100 points each
```

### Points of Interest

```typescript
const pois = geoSyn.generatePOIs(200);
console.log(pois[0]);
// {
//   id: 'poi_0',
//   name: 'Location 0',
//   location: { latitude: 37.75, longitude: -122.45 },
//   category: 'restaurant'
// }
```

### Geo-Indistinguishability

```typescript
const privatizedPoint = geoSyn.applyGeoIndistinguishability(
  { latitude: 37.7749, longitude: -122.4194 },
  0.1 // epsilon
);
```

### Mobility Patterns

```typescript
const pattern = geoSyn.generateMobilityPattern(
  startPoint,
  3600000, // 1 hour
  5 // 5 km/h
);
```

## Time-Series Synthesis

```typescript
import { TimeSeriesSynthesizer } from '@intelgraph/synthetic-data';

const tsSyn = new TimeSeriesSynthesizer({
  method: 'arima',
  length: 1000,
  frequency: 'hourly',
  seasonality: {
    enabled: true,
    period: 24
  },
  trend: {
    enabled: true,
    type: 'linear'
  },
  anomalies: {
    enabled: true,
    frequency: 0.01,
    magnitude: 3.0
  }
});

const timeSeries = await tsSyn.generate();
```

## Data Augmentation

### Tabular Augmentation

```typescript
import { DataAugmentor } from '@intelgraph/data-augmentation';

const augmentor = new DataAugmentor();

// Simple augmentation
const augmented = augmentor.augmentTabular(data, 3); // 3x increase

// Class balancing
const balanced = augmentor.balanceClasses(data, 'label');

// SMOTE
const smoted = augmentor.smote(data, 'label', 5);

// Mixup
const mixed = augmentor.mixup(data, 0.2);
```

### Image Augmentation

```typescript
import { ImageAugmentor, AugmentationStrategy } from '@intelgraph/data-augmentation';

const imgAug = new ImageAugmentor();

// Create augmentation pipeline
const pipeline = {
  transforms: [
    imgAug.rotate(15),
    imgAug.flip('horizontal'),
    imgAug.brightness(1.2),
    imgAug.contrast(1.1),
    imgAug.gaussianBlur(1.0),
    imgAug.colorJitter(0.2, 0.2, 0.2)
  ]
};

// AutoAugment
const autoPolicy = AugmentationStrategy.autoAugment('image');

// RandAugment
const randPolicy = AugmentationStrategy.randAugment(3, 5);
```

### Text Augmentation

```typescript
import { TextAugmentor } from '@intelgraph/data-augmentation';

const textAug = new TextAugmentor();

const pipeline = {
  transforms: [
    textAug.synonymReplacement(2),
    textAug.randomInsertion(1),
    textAug.randomSwap(1),
    textAug.backTranslation('es'),
    textAug.paraphrasing()
  ]
};
```

## Quality Assurance

### Quality Assessment

```typescript
import { QualityAssessor } from '@intelgraph/synthetic-data';

const report = QualityAssessor.assess(originalData, syntheticData);

console.log('Overall Score:', report.overallScore);
console.log('Distribution Similarity:', report.metrics.distributionSimilarity);
console.log('Correlation Preservation:', report.metrics.correlationPreservation);
console.log('Statistical Tests:', report.tests);
console.log('Recommendations:', report.recommendations);
```

### Quality Metrics

- **Distribution Similarity**: KS test for each column
- **Correlation Preservation**: Correlation matrix comparison
- **Statistical Fidelity**: Moments comparison (mean, variance, skewness, kurtosis)
- **Diversity**: Uniqueness and entropy
- **Coverage**: Range coverage of original data
- **Realism**: Plausibility checks

## API Reference

### Synthesis Service

The Synthesis Service provides a unified REST API for all synthetic data generation capabilities.

#### Start Service

```bash
cd services/synthesis-service
pnpm install
pnpm start
```

#### API Endpoints

**Health Check**
```
GET /health
```

**Tabular Synthesis**
```
POST /api/synthesize/tabular
Body: {
  data: TabularData,
  config: SynthesisConfig
}
```

**Text Generation**
```
POST /api/synthesize/text
Body: {
  config: TextGenerationConfig,
  numSamples: number,
  prompt?: string
}
```

**Image Synthesis**
```
POST /api/synthesize/image
Body: {
  config: ImageGenerationConfig,
  numImages: number
}
```

**Graph Synthesis**
```
POST /api/synthesize/graph
Body: {
  config: GraphGenerationConfig
}
```

**Privacy - Differential Privacy**
```
POST /api/privacy/differential
Body: {
  config: DPConfig,
  value: number,
  sensitivity: number
}
```

**Privacy - K-Anonymity**
```
POST /api/privacy/k-anonymity
Body: {
  data: TabularData,
  config: AnonymizationConfig
}
```

**Privacy Assessment**
```
POST /api/privacy/assess
Body: {
  original: TabularData,
  synthetic: TabularData,
  config: {
    quasiIdentifiers: string[],
    sensitiveAttributes: string[]
  }
}
```

**Data Augmentation**
```
POST /api/augment/tabular
Body: {
  data: TabularData,
  factor: number
}

POST /api/augment/balance
Body: {
  data: TabularData,
  targetColumn: string
}
```

**Batch Synthesis**
```
POST /api/batch/synthesize
Body: {
  jobs: Array<{
    type: 'tabular' | 'text' | 'image' | 'audio',
    config: any,
    ...
  }>
}
```

## Best Practices

### 1. Privacy Preservation

- Always assess privacy risk before releasing synthetic data
- Use appropriate epsilon values (typically 0.1-10.0)
- Combine multiple privacy techniques (DP + k-anonymity)
- Validate compliance with regulations (GDPR, HIPAA, CCPA)

### 2. Quality Assurance

- Profile original data before synthesis
- Compare statistical properties
- Run comprehensive quality tests
- Use domain experts for validation

### 3. Data Augmentation

- Start with conservative augmentation factors
- Validate augmented data quality
- Use AutoAugment for automatic policy selection
- Monitor for distribution shift

### 4. Production Deployment

- Monitor privacy budget consumption
- Log all synthesis operations
- Implement rate limiting
- Cache frequently used models
- Use batch processing for large-scale synthesis

## Troubleshooting

### Low Quality Scores

- Increase training data size
- Adjust synthesis parameters
- Try different synthesis methods
- Check for data preprocessing issues

### High Privacy Risk

- Decrease epsilon value
- Increase k-anonymity parameter
- Apply additional generalization
- Use suppression for high-risk records

### Performance Issues

- Use batch processing
- Enable caching
- Optimize model parameters
- Consider distributed processing

## Examples

See the `/examples` directory for complete working examples:

- `tabular-synthesis.ts` - Comprehensive tabular data synthesis
- `privacy-preserving.ts` - Privacy-preserving data generation
- `text-generation.ts` - Text synthesis and augmentation
- `image-synthesis.ts` - Image generation and augmentation
- `graph-synthesis.ts` - Network generation
- `geospatial.ts` - Location data synthesis
- `quality-assessment.ts` - Quality evaluation

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/intelgraph/synthetic-data
- Documentation: https://docs.intelgraph.com/synthetic-data
- Email: support@intelgraph.com

## License

Copyright © 2024 IntelGraph. All rights reserved.
