# Audio and Speech Processing Platform Guide

## Overview

The IntelGraph Audio and Speech Processing Platform provides comprehensive capabilities for audio analysis, speech recognition, speaker identification, and acoustic intelligence gathering at enterprise scale.

## Architecture

The platform consists of multiple specialized packages and services:

### Core Packages

1. **@intelgraph/audio-processing** - Core audio types, interfaces, and utilities
2. **@intelgraph/speech-recognition** - Multi-provider speech-to-text
3. **@intelgraph/speaker-identification** - Voice biometrics and speaker recognition
4. **@intelgraph/audio-analytics** - Audio feature extraction and analysis
5. **@intelgraph/audio-enhancement** - Audio quality improvement
6. **@intelgraph/audio-forensics** - Audio authenticity verification
7. **@intelgraph/audio-intelligence** - Acoustic event detection
8. **@intelgraph/telephony** - Telephony and communications integration

### Services

1. **audio-service** - Audio processing orchestration
2. **transcription-service** - Multi-provider transcription management

## Getting Started

### Installation

```bash
# Install all audio packages
pnpm install

# Build packages
pnpm -F @intelgraph/audio-processing build
pnpm -F @intelgraph/speech-recognition build
pnpm -F @intelgraph/speaker-identification build
```

### Basic Usage

#### Speech-to-Text Transcription

```typescript
import { WhisperProvider, STTConfig } from '@intelgraph/speech-recognition';
import { AudioBuffer } from '@intelgraph/audio-processing';

// Initialize provider
const whisper = new WhisperProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'large-v3'
});

// Configure transcription
const config: STTConfig = {
  provider: 'whisper',
  language: 'en-US',
  enableWordTimestamps: true,
  enableAutomaticPunctuation: true
};

// Transcribe audio
const result = await whisper.transcribe(audioBuffer, config);

console.log('Transcription:', result.text);
console.log('Segments:', result.segments);
```

#### Speaker Identification

```typescript
import {
  IVoiceBiometricEnroller,
  ISpeakerIdentifier
} from '@intelgraph/speaker-identification';

// Enroll a speaker
const enrollment = await enroller.enroll('John Doe', audioSamples);

// Identify speaker from audio
const identifications = await identifier.identify(unknownAudio, 5);

console.log('Top match:', identifications[0]);
console.log('Speaker ID:', identifications[0].speakerId);
console.log('Confidence:', identifications[0].confidence);
```

#### Audio Feature Extraction

```typescript
import { IFeatureExtractor } from '@intelgraph/audio-analytics';

// Extract audio features
const features = await extractor.extract(audioBuffer);

console.log('MFCCs:', features.mfcc);
console.log('Spectrogram:', features.spectrogram);
console.log('Pitch:', features.pitch);
```

## Speech Recognition

### Supported Providers

#### OpenAI Whisper

- **Models**: tiny, base, small, medium, large, large-v2, large-v3
- **Languages**: 100+
- **Max Duration**: ~1 hour per file
- **Features**: High accuracy, word timestamps, language detection

```typescript
const whisper = new WhisperProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'large-v3'
});
```

#### Google Cloud Speech-to-Text

- **Models**: latest_long, latest_short, command_and_search
- **Languages**: 125+
- **Max Duration**: 480 minutes (async)
- **Features**: Speaker diarization, custom vocabulary, profanity filter

```typescript
const google = new GoogleSTTProvider({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFilename: './service-account-key.json'
});
```

#### AWS Transcribe

- **Languages**: 100+
- **Max Duration**: 4 hours
- **Features**: Custom vocabulary, channel identification, speaker labels

```typescript
const aws = new AWSTranscribeProvider({
  region: 'us-east-1',
  bucketName: process.env.AWS_TRANSCRIBE_BUCKET
});
```

#### Azure Speech Services

- **Languages**: 100+
- **Max Duration**: 10 minutes (standard), unlimited (batch)
- **Features**: Pronunciation assessment, sentiment analysis

```typescript
const azure = new AzureSTTProvider({
  subscriptionKey: process.env.AZURE_SPEECH_KEY,
  region: 'eastus'
});
```

### Streaming Recognition

```typescript
import { IStreamingSTTProvider } from '@intelgraph/speech-recognition';

const stream = await provider.startStream({
  provider: 'google',
  language: 'en-US',
  interimResults: true,
  vadEnabled: true
});

// Listen for results
stream.onInterimResult((result) => {
  console.log('Interim:', result.text);
});

stream.onFinalResult((result) => {
  console.log('Final:', result.text);
});

// Write audio chunks
for (const chunk of audioChunks) {
  await stream.write(chunk);
}

await stream.end();
```

### Speaker Diarization

```typescript
import { ISpeakerDiarizer } from '@intelgraph/speech-recognition';

const segments = await diarizer.diarize(audioBuffer, {
  minSpeakers: 2,
  maxSpeakers: 5,
  algorithm: 'neural'
});

for (const segment of segments) {
  console.log(`Speaker ${segment.speaker.speakerId}: ${segment.text}`);
  console.log(`Time: ${segment.startTime}s - ${segment.endTime}s`);
}
```

## Speaker Identification

### Voice Biometric Enrollment

```typescript
import { IVoiceBiometricEnroller } from '@intelgraph/speaker-identification';

// Enroll with multiple audio samples for better accuracy
const audioSamples = [sample1, sample2, sample3];

const biometric = await enroller.enroll('Jane Smith', audioSamples);

console.log('Speaker ID:', biometric.speakerId);
console.log('Enrollment quality:', biometric.quality);
console.log('Voiceprint dimension:', biometric.voiceprint.length);
```

### Speaker Verification (1:1)

```typescript
import { ISpeakerVerifier } from '@intelgraph/speaker-identification';

// Verify claimed identity
const result = await verifier.verify(audioBuffer, claimedSpeakerId);

console.log('Verified:', result.verified);
console.log('Confidence:', result.confidence);
console.log('Decision:', result.decision); // accept, reject, uncertain
```

### Speaker Identification (1:N)

```typescript
import { ISpeakerIdentifier } from '@intelgraph/speaker-identification';

// Identify from entire database
const matches = await identifier.identify(audioBuffer, 10);

// Or from specific candidates
const candidateMatches = await identifier.identifyFromCandidates(
  audioBuffer,
  ['speaker-1', 'speaker-2', 'speaker-3']
);
```

### Deepfake Detection

```typescript
import { IDeepfakeDetector } from '@intelgraph/speaker-identification';

const result = await detector.detect(audioBuffer);

console.log('Is deepfake:', result.isDeepfake);
console.log('Confidence:', result.confidence);
console.log('Indicators:', result.indicators);
```

### Voice Characteristics Analysis

```typescript
import { IVoiceAnalyzer } from '@intelgraph/speaker-identification';

const characteristics = await analyzer.analyze(audioBuffer);

console.log('Fundamental frequency:', characteristics.fundamentalFrequency);
console.log('Speaking rate:', characteristics.speakingRate);
console.log('Age estimate:', characteristics.age?.estimated);
console.log('Gender:', characteristics.gender?.estimated);
console.log('Emotion:', characteristics.emotion?.detected);
```

## Audio Analytics

### Feature Extraction

```typescript
import { IFeatureExtractor } from '@intelgraph/audio-analytics';

// Extract all features
const features = await extractor.extract(audioBuffer);

// Extract specific features
const specificFeatures = await extractor.extractSpecific(audioBuffer, [
  'mfcc',
  'spectrogram',
  'pitch'
]);
```

### Voice Activity Detection (VAD)

```typescript
import { IVADDetector } from '@intelgraph/audio-analytics';

const vadResult = await vadDetector.detect(audioBuffer, {
  aggressiveness: 2, // 0-3
  minSpeechDuration: 0.3,
  minSilenceDuration: 0.5,
  algorithm: 'neural'
});

console.log('Speech ratio:', vadResult.speechRatio);
console.log('Speech duration:', vadResult.totalSpeechDuration);
console.log('Segments:', vadResult.segments);
```

### Keyword Spotting

```typescript
import { IKeywordSpotter } from '@intelgraph/audio-analytics';

const keywords = ['urgent', 'emergency', 'classified', 'threat'];
const results = await spotter.spot(audioBuffer, keywords);

for (const result of results) {
  console.log(`Keyword "${result.keyword}" found ${result.count} times`);
  for (const detection of result.detections) {
    console.log(`  At ${detection.startTime}s (confidence: ${detection.confidence})`);
  }
}
```

### Speech Analytics

```typescript
import { ISpeechAnalyzer } from '@intelgraph/audio-analytics';

const analytics = await analyzer.analyze(audioBuffer, transcript);

console.log('Speaking rate:', analytics.speakingRate, 'WPM');
console.log('Filler words:', analytics.fillerWordCount);
console.log('Articulation score:', analytics.articulation);
console.log('Average pause duration:', analytics.averagePauseDuration);
```

### Sentiment Analysis

```typescript
import { ISpeechSentimentAnalyzer } from '@intelgraph/audio-analytics';

const sentiment = await sentimentAnalyzer.analyze(audioBuffer);

console.log('Sentiment:', sentiment.sentiment);
console.log('Confidence:', sentiment.confidence);
console.log('Valence:', sentiment.valence);
console.log('Arousal:', sentiment.arousal);
```

## Audio Enhancement

### Noise Reduction

```typescript
import { INoiseReducer } from '@intelgraph/audio-enhancement';

const result = await noiseReducer.reduce(audioBuffer, {
  algorithm: 'rnn',
  strength: 0.7,
  adaptiveMode: true
});

console.log('Enhanced audio:', result.enhancedAudio);
console.log('SNR improvement:', result.metrics.snrImprovement, 'dB');
console.log('Quality score:', result.metrics.qualityScore);
```

### Echo Cancellation

```typescript
import { IEchoCanceller } from '@intelgraph/audio-enhancement';

const cleanAudio = await echoCanceller.cancel(audioBuffer);
```

### Audio Super-Resolution

```typescript
import { IAudioSuperResolution } from '@intelgraph/audio-enhancement';

// Enhance 8kHz audio to 48kHz
const enhanced = await superRes.enhance(audioBuffer, 48000);
```

## Audio Forensics

### Authenticity Verification

```typescript
import { IAuthenticityVerifier } from '@intelgraph/audio-forensics';

const result = await verifier.verify(audioBuffer);

console.log('Is authentic:', result.isAuthentic);
console.log('Confidence:', result.confidence);

if (result.tampering.length > 0) {
  console.log('Detected tampering:');
  for (const tamper of result.tampering) {
    console.log(`  Type: ${tamper.type}`);
    console.log(`  Location: ${tamper.startTime}s - ${tamper.endTime}s`);
  }
}
```

### Edit Detection

```typescript
const edits = await verifier.detectEdits(audioBuffer);

console.log('Number of edits:', edits.editCount);
console.log('Continuity score:', edits.continuityScore);
```

### Chain of Custody

```typescript
import { IChainOfCustodyManager } from '@intelgraph/audio-forensics';

// Initiate chain of custody
const custody = await custodyManager.initiate(audioBuffer, {
  caseId: 'CASE-2024-001',
  investigator: 'Agent Smith',
  location: 'Evidence Locker A'
});

// Add events
await custodyManager.addEvent(custody.recordId, {
  actor: 'Forensic Analyst',
  action: 'analyzed',
  location: 'Lab 3'
});

// Verify integrity
const isValid = await custodyManager.verify(custody.recordId);
```

## Audio Intelligence

### Gunshot Detection

```typescript
import { IGunshotDetector } from '@intelgraph/audio-intelligence';

const result = await gunshotDetector.detect(audioBuffer);

console.log('Gunshots detected:', result.detected);
console.log('Number of shots:', result.numberOfShots);
if (result.weaponType) {
  console.log('Weapon type:', result.weaponType);
}
```

### Acoustic Event Detection

```typescript
import {
  IAcousticEventDetector,
  AcousticEventType
} from '@intelgraph/audio-intelligence';

const events = await eventDetector.detect(audioBuffer, [
  AcousticEventType.GUNSHOT,
  AcousticEventType.GLASS_BREAK,
  AcousticEventType.SCREAM,
  AcousticEventType.ALARM
]);

for (const event of events) {
  console.log(`${event.type} detected at ${event.startTime}s`);
  console.log(`Confidence: ${event.confidence}`);
}
```

### Sound Source Localization

```typescript
import { ISoundSourceLocalizer } from '@intelgraph/audio-intelligence';

const sources = await localizer.localize(audioBuffer, 4); // 4 microphones

for (const source of sources) {
  console.log(`Source: ${source.source}`);
  console.log(`Azimuth: ${source.location.azimuth}°`);
  console.log(`Elevation: ${source.location.elevation}°`);
  if (source.location.distance) {
    console.log(`Distance: ${source.location.distance}m`);
  }
}
```

## Telephony Integration

### Call Recording

```typescript
import { ICallRecorder, IPBXIntegration } from '@intelgraph/telephony';

// Connect to PBX
await pbx.connect({
  host: 'pbx.example.com',
  port: 5060,
  username: 'admin',
  password: process.env.PBX_PASSWORD,
  protocol: 'sip'
});

// Start recording
await recorder.startRecording(callId);

// Get active calls
const activeCalls = await pbx.getActiveCalls();

// Stop recording and get audio
const audioBuffer = await recorder.stopRecording(callId);
```

### Call Quality Monitoring

```typescript
import { ICallQualityAnalyzer } from '@intelgraph/telephony';

const metrics = await qualityAnalyzer.analyze(audioBuffer, callMetadata);

console.log('MOS Score:', metrics.mos);
console.log('Jitter:', metrics.jitter, 'ms');
console.log('Packet Loss:', metrics.packetLoss, '%');
console.log('Latency:', metrics.latency, 'ms');
```

### DTMF Detection

```typescript
import { IDTMFDetector } from '@intelgraph/telephony';

const dtmfEvents = await dtmfDetector.detect(audioBuffer);

for (const event of dtmfEvents) {
  console.log(`Digit ${event.digit} at ${event.timestamp}s`);
}
```

## Services

### Audio Service

The audio service provides a REST API and WebSocket interface for audio processing:

```bash
# Start service
cd services/audio-service
pnpm dev
```

**Endpoints:**

- `POST /api/audio/upload` - Upload audio file
- `POST /api/audio/transcribe` - Submit transcription job
- `POST /api/audio/identify-speaker` - Identify speaker
- `POST /api/audio/analyze` - Extract audio features
- `WebSocket /` - Real-time audio streaming

### Transcription Service

Dedicated service for managing multi-provider transcription:

```bash
# Start service
cd services/transcription-service
pnpm dev
```

**Endpoints:**

- `GET /api/providers` - List available providers
- `POST /api/transcribe` - Submit transcription job
- `GET /api/transcribe/:jobId` - Get job status
- `GET /api/transcribe/:jobId/result` - Get transcription result
- `POST /api/transcribe/batch` - Submit batch job
- `GET /api/transcribe/batch/:batchId` - Get batch status

## Configuration

### Environment Variables

```bash
# Speech Recognition API Keys
OPENAI_API_KEY=your-openai-key
GOOGLE_PROJECT_ID=your-project-id
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=eastus
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_TRANSCRIBE_BUCKET=your-s3-bucket

# Services
AUDIO_SERVICE_PORT=3020
TRANSCRIPTION_SERVICE_PORT=3021

# Redis (for caching and queues)
REDIS_URL=redis://localhost:6379
```

## Performance Considerations

### Audio Format Recommendations

- **Speech Recognition**: 16kHz mono, 16-bit PCM or FLAC
- **Speaker Identification**: 16kHz+ mono, high quality
- **Telephony**: 8kHz mono (narrowband) or 16kHz (wideband)
- **Music/Acoustic Analysis**: 44.1kHz stereo, lossless format

### Optimization Tips

1. **Use appropriate sample rates**: Higher isn't always better
2. **Enable caching**: Cache transcription results to avoid re-processing
3. **Batch processing**: Process multiple files in parallel
4. **Streaming**: Use streaming APIs for long audio files
5. **Preprocessing**: Apply VAD to remove silence before processing

## Security Best Practices

1. **API Key Management**: Use environment variables, never commit keys
2. **Audio Encryption**: Encrypt audio files at rest and in transit
3. **Access Control**: Implement proper authentication and authorization
4. **Audit Logging**: Log all audio processing activities
5. **Data Retention**: Implement policies for audio data retention
6. **Chain of Custody**: Track all audio file access and modifications

## Troubleshooting

### Common Issues

**Issue**: Low transcription accuracy

- Check audio quality (SNR, sample rate)
- Try different providers
- Use custom vocabulary for domain-specific terms
- Enable automatic punctuation

**Issue**: Speaker identification fails

- Ensure minimum 30 seconds of clean speech for enrollment
- Use multiple audio samples for enrollment
- Check for background noise
- Verify audio format compatibility

**Issue**: High latency for processing

- Use streaming APIs for real-time requirements
- Enable caching for repeated requests
- Consider preprocessing (VAD, noise reduction)
- Use appropriate service region

## Support and Resources

- Documentation: `/docs/audio/`
- Examples: `/examples/audio/`
- API Reference: Auto-generated from TypeScript types
- Issues: GitHub Issues

## License

MIT
