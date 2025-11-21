# SIGINT Training Platform Guide

## Overview

This is a **TRAINING AND SIMULATION** platform for signals intelligence concepts. It does NOT implement actual signal interception capabilities.

**Compliance References:**
- NSPM-7 (National Security Presidential Memorandum 7)
- Executive Order 12333
- USSID 18 (U.S. Signals Intelligence Directive 18)
- DoD 5240.1-R

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGINT Training Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   SIGINT    │  │  Compliance │  │    API      │              │
│  │   Engine    │  │   Manager   │  │   Routes    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │              Processing Layer                  │              │
│  ├──────────────────────────────────────────────-┤              │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │              │
│  │  │ COMINT   │ │  ELINT   │ │ Network  │      │              │
│  │  │ Analyzer │ │ Analyzer │ │ Analyzer │      │              │
│  │  └──────────┘ └──────────┘ └──────────┘      │              │
│  └──────────────────────────────────────────────-┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────-┐              │
│  │              Collection Layer                  │              │
│  ├──────────────────────────────────────────────-┤              │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │              │
│  │  │ Signal   │ │ Spectrum │ │ Signal   │      │              │
│  │  │Collector │ │ Monitor  │ │Generator │      │              │
│  │  └──────────┘ └──────────┘ └──────────┘      │              │
│  └──────────────────────────────────────────────-┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────-┐              │
│  │           Support Components                   │              │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │              │
│  │  │ Crypto   │ │  Geo-    │ │   RF     │      │              │
│  │  │ Analyzer │ │ location │ │Processor │      │              │
│  │  └──────────┘ └──────────┘ └──────────┘      │              │
│  └──────────────────────────────────────────────-┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Packages

### @summit/sigint-collector
Signal collection simulation and management.

```typescript
import { CollectionManager, SignalGenerator, SpectrumMonitor } from '@summit/sigint-collector';

// Initialize collection manager
const manager = new CollectionManager({ complianceMode: 'TRAINING' });

// Generate simulated signals
const generator = new SignalGenerator({ realism: 'HIGH' });
const signal = generator.generateRFSignal({ signalType: 'CELLULAR_4G' });

// Monitor spectrum
const monitor = new SpectrumMonitor({
  startFrequency: 30e6,
  endFrequency: 6e9,
  resolution: 100e3,
  sweepRate: 1,
  sensitivity: -80
});
monitor.start();
```

### @summit/rf-processor
Digital signal processing and analysis.

```typescript
import { SignalProcessor, ModulationClassifier, SpectralAnalyzer } from '@summit/rf-processor';

// Process signals
const processor = new SignalProcessor(1e6);
const filtered = processor.applyFilter(signal, { type: 'lowpass', cutoffLow: 100000, order: 64 });

// Classify modulation
const classifier = new ModulationClassifier();
const result = classifier.classify(iq.i, iq.q);
console.log(`Detected: ${result.modulation} (${result.confidence * 100}%)`);
```

### @summit/comint-analyzer
Communications intelligence analysis.

```typescript
import { VoiceAnalyzer, MessageAnalyzer, CommunicationsMapper } from '@summit/comint-analyzer';

// Analyze voice (simulated)
const voiceAnalyzer = new VoiceAnalyzer();
const analysis = await voiceAnalyzer.analyzeAudio(audioData, sampleRate);

// Analyze text messages
const messageAnalyzer = new MessageAnalyzer();
const msgAnalysis = await messageAnalyzer.analyze(messageContent);

// Map communications network
const mapper = new CommunicationsMapper();
mapper.addCommunication({ source, target, timestamp, type: 'voice' });
const metrics = mapper.calculateMetrics();
```

### @summit/network-interceptor
Network traffic analysis (simulation only).

```typescript
import { PacketAnalyzer, FlowAnalyzer, ProtocolDecoder } from '@summit/network-interceptor';

// Generate simulated packets
const packetAnalyzer = new PacketAnalyzer();
const packets = packetAnalyzer.generateSimulatedPackets(100);

// Analyze flows
const flowAnalyzer = new FlowAnalyzer();
const flows = flowAnalyzer.generateSimulatedFlows(10);
const stats = flowAnalyzer.getStatistics();
```

### @summit/cryptanalysis-engine
Cryptographic traffic analysis (educational only).

```typescript
import { CryptoAnalyzer, TrafficPatternAnalyzer } from '@summit/cryptanalysis-engine';

// Analyze encrypted traffic metadata
const cryptoAnalyzer = new CryptoAnalyzer();
const metadata = cryptoAnalyzer.analyzeTraffic(packets);

// Classify traffic patterns
const patternAnalyzer = new TrafficPatternAnalyzer();
const session = patternAnalyzer.generateSimulatedSession('voip-call', 60);
```

### @summit/geolocation-engine
Signal-based geolocation.

```typescript
import { TDOALocator, Triangulator, TrackManager } from '@summit/geolocation-engine';

// TDOA geolocation
const locator = new TDOALocator();
locator.registerSensor({ id: 'S1', latitude: 38.9, longitude: -77.0, altitude: 100, timestampAccuracy: 10 });
const position = locator.calculatePosition(measurements);

// Track management
const trackManager = new TrackManager();
trackManager.processLocation(position);
```

## Training Scenarios

Generate comprehensive training scenarios:

```typescript
const engine = new SIGINTEngine(complianceManager);
await engine.start();

// Generate training data
const scenario = await engine.generateTrainingScenario('advanced');
// Returns: { signals, messages, reports, locations }
```

## Compliance

All operations are logged for compliance purposes:

```typescript
const compliance = new ComplianceManager();

// Check authorization
const auth = compliance.checkAuthorization({
  action: 'COLLECT',
  userId: 'operator-1',
  classification: 'SECRET'
});

// Apply minimization
const minimized = compliance.applyMinimization(content, ['US_PERSON_DETECTED']);

// Generate audit report
const report = compliance.getAuditReport({ startDate, endDate });
```

## API Endpoints

### Engine Control
- `GET /api/v1/status` - Get engine status
- `POST /api/v1/engine/start` - Start engine
- `POST /api/v1/engine/stop` - Stop engine

### Processing
- `POST /api/v1/tasks` - Submit processing task
- `POST /api/v1/training/scenario` - Generate training scenario

### Analysis
- `GET /api/v1/spectrum` - Get spectrum data
- `GET /api/v1/comms/network` - Get communications network
- `GET /api/v1/geolocation/tracks` - Get active tracks

### Compliance
- `GET /api/v1/compliance/status` - Get compliance status
- `GET /api/v1/compliance/audit` - Get audit report
- `POST /api/v1/compliance/minimize` - Apply minimization
- `GET /api/v1/compliance/export` - Export for oversight

## Important Notices

1. **TRAINING ONLY**: This platform is for training and simulation purposes only
2. **NO REAL COLLECTION**: No actual signal interception is implemented
3. **SIMULATED DATA**: All data is generated/simulated for training
4. **COMPLIANCE**: All operations are logged for audit purposes
5. **LEGAL AUTHORITY**: Valid training authority is required
