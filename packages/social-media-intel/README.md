# Social Media Intelligence (SOCMINT)

Comprehensive social media analysis package for OSINT operations.

## Features

- **Profile Analysis**: Deep analysis of social media profiles
- **Sentiment Analysis**: Emotion and sentiment detection in posts
- **Network Analysis**: Social network mapping and community detection
- **Bot Detection**: Identify automated accounts
- **Influencer Scoring**: Rank and analyze influencers
- **Account Correlation**: Link accounts across platforms
- **Timeline Reconstruction**: Build comprehensive activity timelines
- **Media Analysis**: Image and video analysis with metadata extraction

## Installation

```bash
pnpm install @intelgraph/social-media-intel
```

## Usage

### Profile Analysis

```typescript
import { ProfileAnalyzer } from '@intelgraph/social-media-intel';

const analyzer = new ProfileAnalyzer();
const result = analyzer.analyzeProfile(profile);

console.log(`Completeness: ${result.analysis.completeness}`);
console.log(`Credibility: ${result.analysis.credibility}`);
console.log(`Risk factors: ${result.analysis.riskFactors.join(', ')}`);
```

### Sentiment Analysis

```typescript
import { SentimentAnalyzer } from '@intelgraph/social-media-intel';

const analyzer = new SentimentAnalyzer();
const sentiment = analyzer.analyze(post.content);

console.log(`Sentiment: ${sentiment.label}`);
console.log(`Polarity: ${sentiment.polarity}`);
console.log(`Emotions:`, sentiment.emotion);
```

### Network Analysis

```typescript
import { NetworkAnalyzer } from '@intelgraph/social-media-intel';

const analyzer = new NetworkAnalyzer();
const network = analyzer.buildNetwork(profiles, relationships);

console.log(`Nodes: ${network.metrics.nodeCount}`);
console.log(`Edges: ${network.metrics.edgeCount}`);
console.log(`Density: ${network.metrics.density}`);

// Detect communities
const withCommunities = analyzer.detectCommunities(network);
```

### Bot Detection

```typescript
import { BotDetector } from '@intelgraph/social-media-intel';

const detector = new BotDetector();
const botScore = detector.analyze(profile, recentPosts);

console.log(`Bot score: ${botScore.score}`);
console.log(`Classification: ${botScore.classification}`);
console.log(`Indicators:`, botScore.indicators);
```

### Influencer Scoring

```typescript
import { InfluencerScorer } from '@intelgraph/social-media-intel';

const scorer = new InfluencerScorer();
const score = scorer.scoreInfluencer(profile, posts);

console.log(`Overall score: ${score.overallScore}`);
console.log(`Category: ${score.category}`);
console.log(`Metrics:`, score.metrics);
```

### Account Correlation

```typescript
import { AccountCorrelator } from '@intelgraph/social-media-intel';

const correlator = new AccountCorrelator();
const results = correlator.correlateAccounts(profiles);

results.forEach(result => {
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Evidence: ${result.evidence.join(', ')}`);
  console.log(`Profiles: ${result.profiles.map(p => p.username).join(', ')}`);
});
```

### Timeline Reconstruction

```typescript
import { TimelineReconstructor } from '@intelgraph/social-media-intel';

const reconstructor = new TimelineReconstructor();
const timeline = reconstructor.buildTimeline(posts);

console.log(`Total events: ${timeline.totalEvents}`);
console.log(`Peak hour: ${timeline.activityPattern.peakHour}:00`);
console.log(`Peak day: ${timeline.activityPattern.peakDay}`);

// Detect gaps
const gaps = reconstructor.detectGaps(timeline, 7);
console.log(`Activity gaps: ${gaps.length}`);
```

## License

MIT
