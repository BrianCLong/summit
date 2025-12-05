# Multimodal Sentiment & Emotion Analysis

Summit now includes advanced multimodal analytical capabilities, allowing Intelligence Community (IC) analysts to assess sentiment and emotion across Audio, Visual, and Text modalities.

## Components

### 1. Audio Sentiment Analyzer
**Location:** `server/src/services/audio/AudioSentimentAnalyzer.ts`

Extracts prosodic features (RMS energy, Zero Crossing Rate, Pitch) from audio streams to classify emotion.
- **Emotions:** Angry, Fearful, Happy, Sad, Neutral
- **Features:**
  - Energy (Volume/RMS)
  - Pitch (Frequency estimation)
  - Diarization (Speaker separation)

### 2. Visual Emotion Analyzer
**Location:** `server/src/services/vision/VisualEmotionAnalyzer.ts`

Analyzes video frames for facial expressions, body language, and scene sentiment.
- **Facial Analysis:** Detects faces and classifies micro-expressions.
- **Scene Analysis:** Determines environment mood (lighting, crowd).
- **Body Language:** Estimates posture (Open/Defensive) and arousal.

### 3. Multimodal Fusion
**Location:** `server/src/services/multimodal/MultimodalSentimentFusion.ts`

Combines independent modality scores using a weighted late-fusion strategy with coherence checking.
- **Algorithm:** Weighted Average + Coherence Metric
- **Outputs:** Primary Emotion, Aggregate Sentiment Score (-1 to 1), Confidence.

### 4. Integration with IntelGraph
**Location:** `server/src/services/multimodal/SentimentGraphIntegration.ts`

Persists analysis results into the Neo4j Knowledge Graph.
- **Schema:** `(Entity)-[:HAS_SENTIMENT]->(SentimentAnalysis)`
- **Querying:** Find entities exhibiting specific emotions (e.g., "Find all angry targets in Sector 4").

## Usage Example

```typescript
import { AudioSentimentAnalyzer } from './services/audio/AudioSentimentAnalyzer';
import { VisualEmotionAnalyzer } from './services/vision/VisualEmotionAnalyzer';
import { MultimodalSentimentFusion } from './services/multimodal/MultimodalSentimentFusion';

const audioAnalyzer = new AudioSentimentAnalyzer();
const visualAnalyzer = new VisualEmotionAnalyzer();
const fuser = new MultimodalSentimentFusion();

// 1. Analyze Audio
const audioResult = await audioAnalyzer.classifyEmotion(
  await audioAnalyzer.extractFeatures(audioBuffer)
);

// 2. Analyze Video Frame
const visualResult = await visualAnalyzer.analyzeFrame(frameBuffer);

// 3. Fuse Results (assuming text is optional or analyzed separately)
const finalResult = fuser.fuse(audioResult, visualResult, undefined);

console.log(`Primary Emotion: ${finalResult.primaryEmotion}`);
console.log(`Coherence: ${finalResult.coherence}`);
```

## Performance Targets
- **Audio Accuracy:** >70%
- **Visual Accuracy:** >65%
- **Fusion Improvement:** +10% over single modality

## IC Use Cases
1. **Interrogation Analysis:** Assess truthful/deceptive behavior via stress indicators (Voice Pitch + Microexpressions).
2. **Surveillance Assessment:** Detect hostile crowds (Scene Analysis + Audio Energy).
3. **Cross-Check:** Verify if the transcript sentiment matches the speaker's tone.
