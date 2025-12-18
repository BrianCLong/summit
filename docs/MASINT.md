# Measurement and Signature Intelligence (MASINT) Platform

## Overview

The MASINT Platform module provides advanced capabilities for detecting, tracking, and identifying targets through distinctive characteristics (signatures) and fixed or dynamic metric parameters.

This module integrates multiple sensing disciplines into a unified intelligence stream.

## Capabilities

The platform supports the following MASINT disciplines:

### 1. RF Emissions Analysis
- **Detection**: Frequencies, bandwidths, modulation types.
- **Analysis**: Identification of emitter types (Radar vs Comms), threat level assessment.
- **Output**: `RFSignal` analysis with recommendations.

### 2. Acoustic Signature Processing
- **Detection**: Sound waves, underwater acoustics.
- **Analysis**: Classification of events (explosions, vehicle movement, speech).
- **Output**: `AcousticSignal` classification and anomaly detection.

### 3. Nuclear Detection
- **Detection**: Isotopes, radiation levels (Sv), count rates.
- **Analysis**: Discrimination between industrial sources and weapons-grade materials.
- **Output**: `NuclearSignal` with critical alerts for high-threat isotopes.

### 4. Chemical / Biological Sensors
- **Detection**: Agent names, concentration (ppm).
- **Analysis**: Immediate threat classification.
- **Output**: `ChemBioSignal` with containment recommendations.

### 5. Seismic Monitoring
- **Detection**: P-waves, S-waves, magnitude, depth.
- **Analysis**: Differentiation between natural earthquakes and underground explosions (nuclear tests).
- **Output**: `SeismicSignal` event typing.

### 6. Radar Cross-Section (RCS) Analysis
- **Detection**: RCS values (dBsm), aspect angles.
- **Analysis**: Identification of stealth characteristics.
- **Output**: `RadarCrossSection` target classification.

### 7. Infrared Signature Detection
- **Detection**: Thermal intensity, wavelength.
- **Analysis**: Launch detection (plumes) vs static heat sources.
- **Output**: `InfraredSignal` threat assessment.

### 8. Spectral Analysis
- **Detection**: Multi-spectral band intensity.
- **Analysis**: Material classification.
- **Output**: `SpectralSignal` material identification.

### 9. Atmospheric Monitoring
- **Detection**: Pressure, humidity, trace gases.
- **Analysis**: Environmental context for other sensor readings.
- **Output**: `AtmosphericSignal` data.

## API Usage

### Ingest Signal

**Endpoint:** `POST /api/masint/ingest`

**Headers:**
- `Authorization`: Bearer <token>
- `Content-Type`: `application/json`

**Body:**

```json
{
  "type": "rf",
  "data": {
    "id": "uuid-v4",
    "timestamp": "2023-10-27T10:00:00Z",
    "frequencyMhz": 9500,
    "bandwidthMhz": 50,
    "modulation": "PULSE",
    "powerDbm": 60,
    "location": {
      "latitude": 34.1,
      "longitude": -118.2
    }
  }
}
```

**Response:**

```json
{
  "signalId": "uuid-v4",
  "timestamp": "2023-10-27T10:00:01Z",
  "threatLevel": "HIGH",
  "classification": "RADAR",
  "confidence": 0.85,
  "anomalies": [],
  "recommendations": ["Initiate jamming", "Triangulate source"]
}
```

### Retrieve Analysis

**Endpoint:** `GET /api/masint/analysis/:id`

**Response:** Returns the stored analysis result.
