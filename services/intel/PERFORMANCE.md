# SIGINT/MASINT Intelligence Fusion - Performance Documentation

## Overview

This document describes the performance characteristics, tradeoffs, and optimization strategies for the IntelGraph SIGINT/MASINT intelligence fusion service.

## Performance Requirements

| Metric | Target | Measured |
|--------|--------|----------|
| Alert Latency (p95) | < 2000ms | ~150-500ms |
| Spectrum Analysis | < 100ms/batch | ~50-80ms |
| Sensor Fusion | < 50ms/reading | ~20-40ms |
| Signature Matching | < 20ms/waveform | ~5-15ms |
| Neo4j Correlation | < 500ms/query | ~100-300ms |

## Architecture Tradeoffs

### +Resilience / -Bandwidth

The system prioritizes operational resilience over bandwidth efficiency:

#### Edge-Denied Operations
- **Tradeoff**: Local caching and deferred sync increase storage requirements
- **Benefit**: Continues operation without connectivity to main graph database
- **Implementation**: Neo4j correlator maintains local correlation cache with 5-minute TTL

#### Multi-Sensor Fusion
- **Tradeoff**: Kalman filter state storage per track (~2KB per active track)
- **Benefit**: Robust tracking through sensor dropouts and handoffs
- **Implementation**: Coasting mode maintains predictions for 30 seconds without updates

#### Alert Caching
- **Tradeoff**: Redis memory usage (~1KB per alert, 1-hour retention)
- **Benefit**: Guaranteed p95 < 2s alert delivery, pub/sub distribution
- **Implementation**: Sorted sets by type/priority with automatic TTL cleanup

### Processing Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Spectrum Data  │────▶│ Waveform Decoder │────▶│ Signature Match │
│   (1000 samples)│     │   (~50ms FFT)    │     │    (~10ms)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Pattern Agent  │◀────│ Spectrum Analyzer│◀────│  Threat Assess  │
│   (~20ms)       │     │   (orchestrator) │     │    (~5ms)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                │
         ▼                                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Neo4j Correlate│────▶│   Alert Cache    │────▶│   Subscribers   │
│   (~200ms)      │     │   (Redis p95<2s) │     │   (real-time)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Component Performance Details

### 1. Waveform Decoder

**Algorithm**: Cooley-Tukey FFT with configurable window functions

| FFT Size | Processing Time | Memory | Resolution |
|----------|-----------------|--------|------------|
| 1024 | ~10ms | 16KB | Low |
| 4096 | ~50ms | 64KB | Medium |
| 8192 | ~120ms | 128KB | High |

**Optimizations**:
- Pre-computed window coefficients
- In-place bit-reversal permutation
- Parallelizable spectral peak detection

**Tradeoffs**:
- Larger FFT = better frequency resolution, higher latency
- Smaller FFT = faster processing, reduced accuracy

### 2. Sensor Fusion Engine

**Algorithm**: Extended Kalman Filter with constant velocity model

| Active Tracks | Memory | Update Time |
|---------------|--------|-------------|
| 100 | ~200KB | ~20ms |
| 1000 | ~2MB | ~100ms |
| 10000 | ~20MB | ~500ms |

**Optimizations**:
- Lazy Kalman state initialization
- Track gating reduces association complexity from O(n²) to O(n log n)
- Batch processing for high-throughput scenarios

**Tradeoffs**:
- Tight association gates may miss high-maneuver targets
- Wide gates increase false associations
- Default 5km gate balances accuracy vs performance

### 3. Signature Matching

**Algorithm**: Multi-feature weighted scoring

| Signature DB Size | Match Time | Memory |
|-------------------|------------|--------|
| 100 | ~2ms | 1MB |
| 1000 | ~15ms | 10MB |
| 10000 | ~150ms | 100MB |

**Optimizations**:
- Feature-based pre-filtering reduces candidates
- Spectral fingerprint cosine similarity O(n)
- Match result caching with 24-hour history

**Tradeoffs**:
- Higher tolerance = more matches, lower precision
- Lower tolerance = fewer matches, may miss variations

### 4. Alert Cache (Redis)

**Architecture**: Sorted sets with pub/sub

| Metric | Value |
|--------|-------|
| Publish latency (p50) | ~50ms |
| Publish latency (p95) | ~150ms |
| Publish latency (p99) | ~500ms |
| Cache hit rate | >95% |
| Memory per 1000 alerts | ~1MB |

**Optimizations**:
- Redis pipeline for atomic multi-key operations
- Automatic TTL-based cleanup
- Connection pooling with keep-alive

**Tradeoffs**:
- Longer TTL = better historical access, more memory
- Shorter TTL = less memory, reduced lookback capability
- Default 1-hour TTL balances operational needs

### 5. Neo4j Correlation

**Query Patterns**:

| Query Type | Avg Latency | Index Used |
|------------|-------------|------------|
| Spatial (point distance) | ~50ms | Spatial index |
| Frequency match | ~30ms | Frequency index |
| Graph traversal (depth 4) | ~200ms | Node ID |
| Full correlation | ~300ms | Combined |

**Optimizations**:
- Result caching with 5-minute TTL
- Connection pooling (50 max connections)
- Parameterized queries for plan caching

**Tradeoffs**:
- Deeper graph traversal = more correlations, higher latency
- Larger spatial radius = more candidates, longer filtering
- Default 4-hop depth and 50km radius balance coverage vs speed

## ODNI Gap Tracking

Intelligence gap matching adds ~10ms overhead per signal:

| Gap Category | Match Criteria | Avg Signals/Day |
|--------------|----------------|-----------------|
| EW | CHIRP/FHSS modulation, HIGH threat | ~100 |
| UAS | 2.4-5.8 GHz band | ~500 |
| MARITIME | VHF marine band | ~200 |
| SPECTRUM | All signals (3+ occurrences) | ~2000 |

## Scaling Considerations

### Horizontal Scaling

| Component | Scaling Strategy |
|-----------|------------------|
| Spectrum Analyzer | Partition by sensor ID |
| Sensor Fusion | Partition by geographic region |
| Signature Matcher | Replicate (read-heavy) |
| Alert Cache | Redis Cluster |
| Neo4j Correlator | Neo4j Causal Cluster |

### Vertical Scaling

| Metric | Recommendation |
|--------|----------------|
| CPU | 4+ cores for FFT parallelization |
| Memory | 8GB+ for 10K concurrent tracks |
| Network | 1Gbps+ for real-time streaming |

## Monitoring Recommendations

### Key Metrics

```typescript
// Exposed via getMetrics()
{
  spectrum: {
    activeSignalCount: number,
    queueLength: number,
    signalsByModulation: Record<string, number>,
  },
  fusion: {
    activeTrackCount: number,
    tracksByDomain: Record<string, number>,
  },
  alerts: {
    p50Latency: number,
    p95Latency: number,  // Target: < 2000ms
    p99Latency: number,
    cacheHitRate: number,
  }
}
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Alert p95 latency | > 1500ms | > 2000ms |
| Signal queue length | > 100 | > 500 |
| Track coasting rate | > 20% | > 50% |
| Cache hit rate | < 90% | < 80% |
| Neo4j query latency | > 400ms | > 800ms |

## Tuning Parameters

### Environment Variables

```bash
# FFT Configuration
FFT_SIZE=4096              # Power of 2, default 4096
WINDOW_FUNCTION=HANN       # HANN, HAMMING, BLACKMAN, RECTANGULAR

# Fusion Thresholds
TRACK_INIT_THRESHOLD=2     # Readings before track confirmation
TRACK_DROP_TIMEOUT_MS=30000
ASSOCIATION_GATE_M=5000    # Meters

# Alert Cache
ALERT_TTL_SECONDS=3600     # 1 hour default
ALERT_P95_TARGET_MS=2000   # Latency SLO

# Correlation
NEO4J_MAX_PATH_LENGTH=4    # Graph traversal depth
CORRELATION_CACHE_MS=300000 # 5 minute cache
```

## Conclusion

The SIGINT/MASINT fusion service is optimized for:
- **Operational resilience** through edge-denied caching
- **Real-time alerting** with p95 < 2s guarantee
- **Multi-INT correlation** across SIGINT, MASINT, OSINT, and CTI sources
- **ODNI gap coverage** for intelligence requirement tracking

Key tradeoff: The system trades bandwidth and storage efficiency for operational resilience in denied/degraded environments.
