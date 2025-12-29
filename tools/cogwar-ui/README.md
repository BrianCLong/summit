# SummitCogWar War Room UI

This is the Streamlit-based "War Room" UI for the SummitCogWar platform.

## Prerequisites

- Python 3.8+
- `pip`

## Installation

```bash
pip install streamlit requests pandas
```

## Running the War Room

```bash
streamlit run app.py
```

Ensure the SummitCogWar backend (Node.js) is running on `http://localhost:3000` (or configure `API_URL` in `app.py`).

## Features

- **Monitoring**: Real-time view of cognitive metrics and narrative streams.
- **Red Team**: Interface to deploy `CogSwarm` agents for memetic operations.
- **Blue Team**: Interface for `MindShield` analysis and vaccine deployment.
