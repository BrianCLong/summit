# Advanced SIGINT Platform

The `server/src/sigint` module implements a comprehensive Signals Intelligence (SIGINT) processing capability for IntelGraph.

## Capabilities

- **RF Signal Collection**: Ingests raw signal metadata.
- **Signal Classification**: Identifies signal types (Radar, GSM, Marine VHF) and threat levels.
- **Spectrum Analysis**: Detects Frequency Hopping (FHSS) and Jamming.
- **Geolocation**: Simulates Direction Finding (DF).
- **COMINT**: Simulates decryption and metadata extraction.

## Usage

### Ingest a Signal
```bash
curl -X POST http://localhost:8000/api/sigint/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": 1215000000,
    "bandwidth": 2000000,
    "power": -35,
    "duration": 50
  }'
```

### View Emitters
```bash
curl http://localhost:8000/api/sigint/emitters
```

## Development

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed design.

### Running Tests
```bash
npx jest server/tests/sigint/SigIntPlatform.test.ts
```
