# WarGamed Decision Support Dashboard

**WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY**

This document provides instructions for setting up and using the WarGamed Decision Support Dashboard, an extension for the IntelGraph platform. This dashboard is designed for hypothetical scenario simulation and training purposes, focusing on defensive/reputational management in global crisis response.

**Ethics Compliance:** All simulations and outputs are flagged as hypothetical/test-only. No real Psychological Operations (PsyOps) content is generated. The focus is strictly on enhancing blue-team defenses by simulating Information Operations (IO) threats and responses based on established military doctrine.

## Overview

The WarGamed Decision Support Dashboard provides executive leadership with a simulated interface for managing reputational PsyOps during global crisis response. It integrates:
*   Live Social Media Telemetry (simulated)
*   Adversary Intent Estimation (simulated via LLM)
*   Narrative Heatmaps (simulated)
*   Strategic Response Playbooks (modeled on military IO doctrine)

## Setup Instructions

This module integrates with the existing IntelGraph backend (Node.js/TypeScript) and frontend (React), and introduces a new Python AI/ML service.

### Prerequisites

Ensure you have the IntelGraph development environment set up, including:
*   Node.js 20+
*   Python 3.9+
*   Neo4j 5+
*   Docker and Docker Compose (for containerized setup)
*   All existing IntelGraph dependencies installed.

### Backend Setup (IntelGraph Server)

The backend changes involve new GraphQL schema definitions and resolvers. These have been integrated into the `server/` directory.

1.  **Navigate to the server directory:**
    ```bash
    cd intelgraph/server
    ```
2.  **Install dependencies (if not already done):**
    ```bash
    npm install
    ```
3.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
4.  **Start the IntelGraph server:**
    ```bash
    # Ensure PYTHON_API_URL is set if running outside Docker Compose
    # export PYTHON_API_URL=http://localhost:8000
    npm run dev # For development with hot-reloading
    # or
    npm start # For production build
    ```
    The server should now expose the new GraphQL queries and mutations for the WarGame Dashboard.

### Python AI/ML Service Setup

This service provides NLP and LLM functionalities.

1.  **Navigate to the API directory:**
    ```bash
    cd intelgraph/api
    ```
2.  **Install Python dependencies:**
    You will need to install `fastapi`, `uvicorn`, `spacy`, `sentence-transformers`, and potentially `transformers` (for LLM).
    It is recommended to create a `requirements.txt` file if one doesn't exist, and install from there.

    **Example `api/requirements.txt`:**
    ```
    fastapi==0.111.0
    uvicorn==0.30.1
    neo4j==5.21.0
    redis==5.0.1
    spacy==3.7.5
    sentence-transformers==2.7.0
    # For LLM, if using Hugging Face transformers directly:
    # transformers==4.42.3
    # torch # or tensorflow, depending on your setup
    ```
    Then install:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Download spaCy model:**
    ```bash
    python -m spacy download en_core_web_sm
    ```
4.  **Start the FastAPI application:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The Python API will be available at `http://localhost:8000`.

### Frontend Setup (IntelGraph Client)

The frontend changes involve new React components and routing.

1.  **Navigate to the client directory:**
    ```bash
    cd intelgraph/client
    ```
2.  **Install dependencies (if not already done):**
    ```bash
    npm install
    ```
3.  **Start the IntelGraph client:**
    ```bash
    npm run dev
    ```
    The client application should now be running, and you should see a new "WarGame Dashboard" item in the navigation menu.

### Docker Compose Setup (Recommended for Dev)

For a fully containerized development environment, you will need to update your `docker-compose.dev.yml` or `docker-compose.yml` to include the new Python API service.

**Example `docker-compose.dev.yml` snippet (add this service):**

```yaml
  api:
    build:
      context: ./api
      dockerfile: Dockerfile # You might need to create a Dockerfile for the API
    ports:
      - "8000:8000"
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: ${NEO4J_USER:-neo4j}
      NEO4J_PASSWORD: ${NEO4J_PASSWORD:-password}
      REDIS_URL: redis://redis:6379
    depends_on:
      - neo4j
      - redis
    volumes:
      - ./api:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You will also need to ensure the `server` service can reach the `api` service. Update the `server` service in `docker-compose.dev.yml` to include `PYTHON_API_URL`:

```yaml
  server:
    build:
      context: ./server
      dockerfile: Dockerfile # Assuming you have a Dockerfile for the server
    ports:
      - "4000:4000"
    environment:
      # ... existing environment variables ...
      PYTHON_API_URL: http://api:8000 # Point to the new API service
    depends_on:
      - neo4j
      - redis
      - api # Ensure server starts after api
    volumes:
      - ./server:/app
    command: npm run dev
```

After updating `docker-compose.dev.yml`, from the project root:
```bash
docker-compose -f docker-compose.dev.yml up --build
```
This will build and start all necessary services, including Neo4j, Redis, the Python API, the IntelGraph server, and the client.

## Seeding Sample Crisis Data

The `WargameResolver` now persists data to Neo4j and calls the Python AI/ML services.

### Using GraphQL Playground

Once the server and Python API are running, you can use a GraphQL client (like Apollo Sandbox or Insomnia) to send mutations.

**Example Mutation to Run a Simulation:**

```graphql
mutation RunWarGameSimulation {
  runWarGameSimulation(input: {
    crisisType: "geopolitical_conflict",
    targetAudiences: ["allies", "neutrals", "adversaries"],
    keyNarratives: ["disinformation_campaigns", "economic_instability"],
    adversaryProfiles: ["state_actor_X", "non_state_actor_Y"],
    simulationParameters: {
      durationDays: 7,
      initialImpact: "high",
      socialMediaVolumeMultiplier: 1.5
    }
  }) {
    id
    crisisType
    createdAt
    targetAudiences
    keyNarratives
    adversaryProfiles
    simulationParameters
  }
}
```

Running this mutation will create a new crisis scenario in Neo4j and trigger calls to the Python API for simulated telemetry analysis, intent estimation, and playbook generation, with results also stored in Neo4j. You can then select this scenario in the frontend dashboard to view the simulated data.

## Future Enhancements

*   **Advanced AI/ML:**
    *   Integrate with IntelGraph's existing NLP models (spaCy, sentence transformers) for more sophisticated entity extraction, sentiment analysis, and narrative detection from simulated social media content.
    *   Develop a dedicated LLM service (e.g., using Llama via Hugging Face) for more nuanced adversary intent estimation and dynamic playbook generation.
*   **Simulation Engine:** Enhance the "what-if" simulation logic to propagate effects through the graph, including temporal analysis and more complex influence modeling.
*   **UI/UX Refinements:** Improve the visual presentation of heatmaps, add more interactive elements, and enhance data filtering/analysis capabilities.
*   **Testing:** Implement comprehensive unit and end-to-end tests for all new components.