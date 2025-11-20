# CTI Client SDK

Python client library for interacting with the IntelGraph Cyber Threat Intelligence Platform.

## Installation

```bash
pip install -e .
```

## Usage

### Cyber Intel Client

```python
from client import CTIClient

# Initialize client
client = CTIClient(base_url="http://localhost:8000", api_key="your-api-key")

# Create IOC
ioc = client.create_ioc(
    ioc_type="IP_ADDRESS",
    value="192.0.2.1",
    severity="HIGH",
    confidence=85,
    tags=["malware"]
)

# List IOCs
iocs = client.list_iocs(severity="HIGH", limit=100)

# Enrich IOC
enriched = client.enrich_ioc(ioc['id'], providers=["VIRUSTOTAL", "ABUSEIPDB"])

# Create threat intelligence
threat = client.create_threat(
    title="New Ransomware Campaign",
    description="Targeting healthcare sector",
    severity="CRITICAL",
    tlp="AMBER"
)

# Get statistics
stats = client.get_statistics()
```

### Threat Hunting Client

```python
from client import ThreatHuntingClient

# Initialize client
hunt_client = ThreatHuntingClient(base_url="http://localhost:8001")

# Create and execute hunt
hunt = hunt_client.create_hunt(
    name="Lateral Movement Detection",
    description="Hunt for SMB-based lateral movement",
    hypothesis={
        "title": "PsExec Usage",
        "description": "Detect PsExec lateral movement",
        "assumptions": ["Adversary has credentials"],
        "data_sources": ["process_logs"],
        "priority": "HIGH"
    },
    auto_execute=True
)

# Get hunt findings
findings = hunt_client.get_hunt_findings(hunt['id'])

# Execute IOC sweep
sweep = hunt_client.sweep_iocs(
    iocs=["192.0.2.1", "evil.com"],
    scope="all",
    lookback_hours=24
)

# Behavioral analysis
analysis = hunt_client.analyze_behavior(
    entity_id="user123",
    entity_type="user",
    analysis_window_hours=24
)
```

## API Reference

See main documentation at `docs/cyber/GUIDE.md`.
