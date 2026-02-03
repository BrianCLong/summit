# Cognitive Security Alerting

This module contains the interface and adapters for ingesting signals from external monitoring tools (social listening, security SIEM) and converting them into `CognitiveAlert` objects.

## Architecture
*   `adapter_interface.py`: Defines the contract for all adapters.
*   `adapters/`: Implementations (e.g., `BrandWatchAdapter`, `SplunkAdapter`) - *Not yet implemented*.
*   `fixtures/`: Sample payloads for testing.

## Integration
Adapters are loaded by the Fusion Cell dashboard to surface alerts for triage.
