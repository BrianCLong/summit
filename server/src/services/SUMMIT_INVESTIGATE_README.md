# SummitInvestigate Platform

**SummitInvestigate** is a comprehensive open-source investigative OSINT platform designed to surpass current methodologies (like those of Bellingcat) through automation, AI augmentation, and scalability.

## Core Modules

### 1. AI-Augmented Verification Swarm
**Location:** `server/src/services/VerificationSwarmService.ts`
- **Purpose:** Orchestrates a "swarm" of specialized AI agents (PhotoAnalyst, GeoExpert, FactChecker) to verify media and claims.
- **Features:**
    - Parallel execution of verification tasks.
    - "Self-critique" synthesis loop to determine final verdicts.
    - Integration with simulated external tools (SunCalc, Reverse Image Search).

### 2. Semantic Evidence Fusion
**Location:** `server/src/services/EvidenceFusionService.ts`
- **Purpose:** Synthesizes disparate evidence into coherent timelines and narratives using RAG and GenAI.
- **Features:**
    - Automated timeline construction with causal linking.
    - Hypothesis generation ("likely event chains") based on incomplete data.
    - Semantic linking of evidence nodes.

### 3. Multilingual Deepfake Hunter
**Location:** `server/src/services/DeepfakeHunterService.ts`
- **Purpose:** Detects AI-generated media and propaganda across languages.
- **Features:**
    - Simulated "Waterfall" detection (Watermarks -> Artifacts -> Semantics).
    - Multilingual propaganda analysis.
    - Origin attribution.

### 4. Predictive Scenario Simulator
**Location:** `server/src/services/PredictiveScenarioSimulator.ts`
- **Purpose:** ML-driven "what-if" modeling for conflicts and risk forecasting.
- **Features:**
    - Generates Best/Worst/Likely scenarios based on initial conditions.
    - Forecasts risk levels and key event timelines.

### 5. Real-Time Global Collaboration Hub
**Location:** `server/src/services/collaborationService.ts` (Enhanced)
- **Purpose:** Enables distributed teams to investigate together in real-time.
- **New Features:**
    - **Consensus ML:** Automated conflict resolution for concurrent edits.
    - **Auto-Archiving:** Simulated integration with Wayback Machine for evidence preservation.

## API Usage

All modules are exposed via the `SummitInvestigate` integration layer at `/api/summit-investigate`.

### Example: Verification
```http
POST /api/summit-investigate/verification/submit
Content-Type: application/json

{
  "type": "IMAGE",
  "content": "http://example.com/suspicious-tank.jpg",
  "context": { "claimed_location": "Ukraine/Russia border" }
}
```

### Example: Simulation
```http
POST /api/summit-investigate/simulation/run
Content-Type: application/json

{
  "scenarioType": "CONFLICT",
  "initialConditions": { "troops": 5000, "region": "Border" },
  "timeHorizonDays": 7,
  "variables": ["weather", "sanctions"]
}
```

## Roadmap

- [x] Core Services Implementation
- [x] API Integration
- [ ] Frontend "Global Colab Hub" Interface (React/Canvas)
- [ ] Integration with real LLM Providers (OpenAI, Anthropic)
- [ ] Integration with real Forensic Tools (ExifTool, SunCalc API)
