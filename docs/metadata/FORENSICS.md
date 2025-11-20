# Forensic Analysis Guide

## Overview

This guide covers advanced forensic analysis capabilities of the IntelGraph Metadata Analysis Platform, focusing on investigation workflows, evidence collection, and intelligence generation.

## Forensic Workflows

### 1. Evidence Collection

#### Single Artifact Analysis

```typescript
import { globalRegistry } from '@intelgraph/metadata-extractor';
import { OfficeExtractor } from '@intelgraph/document-metadata';

// Configure for forensic analysis
const config = {
  deepScan: true,
  extractDeleted: true,
  extractHidden: true,
  detectTampering: true,
  generateHashes: true,
};

// Extract with full forensic options
const result = await extractor.extract(evidence, config);

// Verify integrity
console.log('SHA-256:', result.hash?.sha256);
console.log('Anomalies:', result.anomalies);
```

#### Multi-Artifact Investigation

```typescript
import { TimelineBuilder, TimelineAnalyzer } from '@intelgraph/timeline-analyzer';

// Process multiple evidence files
const results = [];
for (const file of evidenceFiles) {
  const result = await globalRegistry.extractAll(file, undefined, config);
  results.push(...result);
}

// Build comprehensive timeline
const builder = new TimelineBuilder();
builder.addResults(results);
const timeline = builder.build();

// Analyze for patterns
const analyzer = new TimelineAnalyzer();
const analysis = analyzer.analyze(timeline);
```

### 2. Attribution Analysis

#### Identifying Authors and Editors

```typescript
import { AttributionAnalyzer } from '@intelgraph/forensic-analysis-service';

const analyzer = new AttributionAnalyzer();
const attributions = await analyzer.analyze(results);

// Group by entity
for (const attr of attributions) {
  console.log(`${attr.role}: ${attr.entity}`);
  console.log(`Confidence: ${attr.confidence}`);
  console.log(`Artifacts: ${attr.artifacts.length}`);
}
```

#### Device Fingerprinting

```typescript
// Extract device metadata
const devices = results
  .filter(r => r.device)
  .map(r => ({
    id: r.id,
    manufacturer: r.device.manufacturer,
    model: r.device.model,
    serial: r.device.serialNumber,
  }));

// Identify unique devices
const uniqueDevices = new Map();
for (const device of devices) {
  const key = device.serial || `${device.manufacturer}-${device.model}`;
  if (!uniqueDevices.has(key)) {
    uniqueDevices.set(key, []);
  }
  uniqueDevices.get(key).push(device.id);
}
```

### 3. Timeline Reconstruction

#### Building Forensic Timelines

```typescript
// Extract all temporal events
const builder = new TimelineBuilder();
builder.addResults(results);
const timeline = builder.build();

// Sort by timestamp
const sortedEvents = timeline.events.sort(
  (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
);

// Export for analysis
console.log('Timeline Events:');
for (const event of sortedEvents) {
  console.log(`${event.timestamp.toISOString()} - ${event.description}`);
}
```

#### Detecting Temporal Anomalies

```typescript
const analyzer = new TimelineAnalyzer();
const analysis = analyzer.analyze(timeline);

// Check for anomalies
for (const anomaly of analysis.anomalies) {
  if (anomaly.type === 'temporal_reversal') {
    console.log('WARNING: Modified before created!');
    console.log('Severity:', anomaly.severity);
    console.log('Evidence:', anomaly.evidence);
  }
}

// Check for gaps
for (const gap of analysis.gaps) {
  console.log(`Gap detected: ${gap.duration}ms`);
  console.log(`From: ${gap.startTime.toISOString()}`);
  console.log(`To: ${gap.endTime.toISOString()}`);
}
```

### 4. Communication Analysis

#### Email Thread Reconstruction

```typescript
import { EmailExtractor } from '@intelgraph/communication-metadata';

const emailResults = results.filter(r => r.communication?.email);

// Build thread graph
const threads = new Map();
for (const result of emailResults) {
  const email = result.communication.email;
  const threadId = email.threadId || email.messageId;

  if (!threads.has(threadId)) {
    threads.set(threadId, []);
  }
  threads.get(threadId).push(email);
}

// Analyze each thread
for (const [threadId, emails] of threads) {
  console.log(`Thread: ${threadId}`);
  console.log(`Emails: ${emails.length}`);

  // Sort by date
  emails.sort((a, b) =>
    (a.date?.getTime() || 0) - (b.date?.getTime() || 0)
  );
}
```

#### Sender/Recipient Analysis

```typescript
// Extract all participants
const participants = new Map();

for (const result of emailResults) {
  const email = result.communication.email;

  if (email.from) {
    const key = email.from.address;
    if (!participants.has(key)) {
      participants.set(key, { sent: 0, received: 0 });
    }
    participants.get(key).sent++;
  }

  for (const recipient of email.to || []) {
    const key = recipient.address;
    if (!participants.has(key)) {
      participants.set(key, { sent: 0, received: 0 });
    }
    participants.get(key).received++;
  }
}

// Identify key players
const sorted = Array.from(participants.entries())
  .sort((a, b) => (b[1].sent + b[1].received) - (a[1].sent + a[1].received));

console.log('Top Participants:');
for (const [email, stats] of sorted.slice(0, 10)) {
  console.log(`${email}: ${stats.sent} sent, ${stats.received} received`);
}
```

### 5. Image Forensics

#### EXIF Analysis

```typescript
import { EXIFExtractor } from '@intelgraph/image-metadata';

const imageResults = results.filter(r => r.image?.exif);

// Extract geolocation data
const geolocated = imageResults.filter(r =>
  r.image.exif.gpsLatitude && r.image.exif.gpsLongitude
);

console.log(`Images with GPS: ${geolocated.length}`);

// Extract camera information
const cameras = new Map();
for (const result of imageResults) {
  const exif = result.image.exif;
  const camera = `${exif.make} ${exif.model}`.trim();

  if (camera) {
    cameras.set(camera, (cameras.get(camera) || 0) + 1);
  }
}

console.log('Cameras detected:');
for (const [camera, count] of cameras) {
  console.log(`${camera}: ${count} images`);
}
```

#### Steganography Detection

```typescript
const stegSuspects = imageResults.filter(r =>
  r.image.analysis.steganographySuspicion &&
  r.image.analysis.steganographySuspicion > 0.7
);

console.log(`Potential steganography: ${stegSuspects.length}`);

for (const suspect of stegSuspects) {
  console.log(`Artifact: ${suspect.id}`);
  console.log(`Suspicion: ${suspect.image.analysis.steganographySuspicion}`);
  console.log(`LSB Anomalies: ${suspect.image.analysis.lsbAnomalies}`);
  console.log(`Anomalies:`, suspect.image.analysis.statisticalAnomalies);
}
```

### 6. Network Forensics

#### Packet Analysis

```typescript
import { PcapExtractor } from '@intelgraph/network-metadata';

const networkResults = results.filter(r => r.network?.packets);

// Analyze traffic patterns
for (const result of networkResults) {
  const packets = result.network.packets;

  // Count by protocol
  const protocols = new Map();
  for (const packet of packets) {
    protocols.set(packet.protocol, (protocols.get(packet.protocol) || 0) + 1);
  }

  console.log('Protocol Distribution:');
  for (const [protocol, count] of protocols) {
    console.log(`${protocol}: ${count} packets`);
  }

  // Detect anomalies
  if (result.anomalies) {
    for (const anomaly of result.anomalies) {
      console.log(`ALERT: ${anomaly.type}`);
      console.log(`Severity: ${anomaly.severity}`);
      console.log(`Evidence:`, anomaly.evidence);
    }
  }
}
```

#### Connection Mapping

```typescript
// Build connection graph
const connections = new Map();

for (const result of networkResults) {
  for (const packet of result.network.packets || []) {
    if (packet.sourceIp && packet.destIp) {
      const key = `${packet.sourceIp} -> ${packet.destIp}`;
      if (!connections.has(key)) {
        connections.set(key, { count: 0, protocols: new Set() });
      }
      connections.get(key).count++;
      connections.get(key).protocols.add(packet.protocol);
    }
  }
}

console.log('Top Connections:');
const sorted = Array.from(connections.entries())
  .sort((a, b) => b[1].count - a[1].count);

for (const [connection, stats] of sorted.slice(0, 20)) {
  console.log(`${connection}: ${stats.count} packets`);
  console.log(`Protocols: ${Array.from(stats.protocols).join(', ')}`);
}
```

### 7. Intelligence Generation

#### Comprehensive Report

```typescript
import { ForensicIntelligence } from '@intelgraph/forensic-analysis-service';

const forensicIntel = new ForensicIntelligence();
const report = await forensicIntel.generateReport(results, {
  includeTimeline: true,
  includeRelationships: true,
  includeAttributions: true,
});

console.log('Forensic Intelligence Report');
console.log('============================');
console.log(`Artifacts Analyzed: ${report.artifacts}`);
console.log(`Insights: ${report.insights.length}`);
console.log(`Relationships: ${report.relationships?.length || 0}`);
console.log(`Attributions: ${report.attributions?.length || 0}`);

// High-severity insights
const critical = report.insights.filter(i =>
  i.severity === 'high' || i.severity === 'critical'
);

console.log('\nCritical Findings:');
for (const insight of critical) {
  console.log(`- ${insight.description}`);
  console.log(`  Confidence: ${insight.confidence}`);
  console.log(`  Evidence: ${insight.evidence.join(', ')}`);
}
```

#### Relationship Mapping

```typescript
const relationships = await forensicIntel.detectRelationships(results);

// Group by type
const byType = new Map();
for (const rel of relationships) {
  if (!byType.has(rel.type)) {
    byType.set(rel.type, []);
  }
  byType.get(rel.type).push(rel);
}

console.log('Relationships Found:');
for (const [type, rels] of byType) {
  console.log(`${type}: ${rels.length}`);

  // Show high-confidence relationships
  const highConf = rels.filter(r => r.confidence > 0.8);
  for (const rel of highConf) {
    console.log(`  ${rel.source} <-> ${rel.target}`);
    console.log(`  Evidence: ${rel.evidence}`);
  }
}
```

## Anti-Forensics Detection

### Timestamp Manipulation

```typescript
// Detect suspicious timestamp patterns
for (const result of results) {
  if (result.anomalies) {
    const timeAnomalies = result.anomalies.filter(a =>
      a.type.includes('temporal') || a.type.includes('timestamp')
    );

    if (timeAnomalies.length > 0) {
      console.log(`WARNING: Timestamp anomalies in ${result.id}`);
      for (const anomaly of timeAnomalies) {
        console.log(`  ${anomaly.description}`);
      }
    }
  }
}
```

### Metadata Scrubbing Detection

```typescript
// Detect missing expected metadata
for (const result of results) {
  const expectedFields = ['temporal', 'attribution', 'hash'];
  const missing = expectedFields.filter(field => !result[field]);

  if (missing.length > 0) {
    console.log(`Possible metadata scrubbing: ${result.id}`);
    console.log(`Missing: ${missing.join(', ')}`);
  }

  // Check for empty attribution
  if (result.attribution && Object.keys(result.attribution).length === 0) {
    console.log(`Empty attribution metadata: ${result.id}`);
  }
}
```

### File Signature Anomalies

```typescript
// Compare file extension with actual content
import { detectFileType } from '@intelgraph/metadata-extractor';

for (const result of results) {
  if (result.base.sourceFile) {
    const extension = result.base.sourceFile.split('.').pop();
    const detectedType = result.base.sourceType;

    // Simple mismatch detection
    if (extension === 'jpg' && detectedType !== 'image') {
      console.log(`File signature mismatch: ${result.base.sourceFile}`);
      console.log(`Extension: ${extension}, Detected: ${detectedType}`);
    }
  }
}
```

## Best Practices for Forensic Analysis

### 1. Evidence Preservation

- Always work with copies, never original files
- Generate cryptographic hashes immediately
- Document all extraction operations
- Maintain chain of custody logs

### 2. Comprehensive Analysis

- Use all available extractors
- Enable deep scan options
- Cross-reference findings
- Look for correlations across artifacts

### 3. Verification

- Verify all timestamps against known references
- Cross-check attribution claims
- Validate geolocation data
- Confirm software versions

### 4. Documentation

- Record all configuration options
- Log all anomalies and findings
- Capture evidence screenshots
- Maintain detailed notes

### 5. Reporting

- Prioritize findings by severity
- Provide clear evidence chains
- Include confidence levels
- Recommend further investigation

## Legal Considerations

1. **Authorization**: Ensure proper legal authority
2. **Privacy**: Respect privacy laws and regulations
3. **Evidence Handling**: Follow proper evidence procedures
4. **Documentation**: Maintain detailed records
5. **Expert Testimony**: Be prepared to explain methodology

## Appendix: Case Studies

### Case Study 1: Document Forgery Detection

Detected backdated document through:
- Temporal anomaly (modified before created)
- Software version newer than claimed date
- Font analysis showing modern typeface

### Case Study 2: Email Spoofing Investigation

Identified spoofed email through:
- SPF/DKIM authentication failures
- Return-Path domain mismatch
- Routing header inconsistencies

### Case Study 3: Image Tampering

Discovered edited photo via:
- EXIF editing software detection
- Thumbnail mismatch
- JPEG quality inconsistencies

## References

- NIST Digital Forensics Guidelines
- ISO/IEC 27037 - Digital Evidence Collection
- RFC 3227 - Evidence Collection and Archiving
- SWGDE Best Practices

## Support

For forensic analysis support:
- Email: forensics@intelgraph.com
- Emergency: +1-xxx-xxx-xxxx
- Training: training@intelgraph.com
