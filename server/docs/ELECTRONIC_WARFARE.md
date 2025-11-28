# Electronic Warfare (EW) Platform

## Overview
The Electronic Warfare Platform provides advanced spectrum dominance capabilities within the IntelGraph system. It enables operators to simulate, manage, and execute operations across the electromagnetic spectrum, including Electronic Attack (EA), Electronic Protection (EP), and Electronic Support (ES).

## Core Capabilities

### 1. Electronic Attack (EA)
- **Jamming**: Supports various jamming techniques including Noise, Spot, Barrage, and DRFM (Digital Radio Frequency Memory) deception.
- **Communication Disruption**: Targeted narrowband disruption of command and control channels.
- **Radar Spoofing**: Injection of false targets into enemy radar systems.

### 2. Electronic Support (ES)
- **Signal Detection**: Real-time monitoring of the spectrum for RF emissions.
- **Pulse Analysis**: Automatic classification of signals (Radar vs. Comms) and parameter extraction (PRI, PW).
- **Direction Finding (DF)**: TDOA-based triangulation of signal sources using multiple sensor assets.

### 3. Electronic Protection (EP)
- **Emission Control (EMCON)**: Management of asset signatures.
- **Frequency Hopping**: Simulation of spread-spectrum techniques to evade jamming.

### 4. Battle Management
- **Spectrum Visualization**: Real-time view of all friendly assets, detected signals, and active jamming missions.
- **EMP Analysis**: Impact assessment for electromagnetic pulse events.

## API Usage

The platform is exposed via GraphQL.

### Example: Registering an Asset
```graphql
mutation {
  ewRegisterAsset(
    id: "jammer-01"
    name: "Ground Jammer Alpha"
    type: "GROUND_STATION"
    lat: 34.05
    lon: -118.25
    capabilities: ["NOISE_JAMMING", "SPOT_JAMMING"]
    maxPower: 5000
    minFreq: 30
    maxFreq: 3000
  ) {
    id
    status
  }
}
```

### Example: Deploying a Jammer
```graphql
mutation {
  ewDeployJammer(
    assetId: "jammer-01"
    targetFrequency: 145.5
    bandwidth: 0.025
    effect: "NOISE_JAMMING"
    durationSeconds: 120
  ) {
    id
    status
    effectiveness
  }
}
```

### Example: Situational Awareness
```graphql
query {
  ewBattleSpace {
    assets { name location { lat lon } }
    signals { frequency type power }
    activeJammers { targetFrequency effectiveness }
    spectrumUtilization
  }
}
```

## Architecture
The system is built as a singleton service (`ElectronicWarfareService`) that maintains the real-time state of the simulation. It emits events for integration with the broader event bus system.
