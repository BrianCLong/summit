# Agentic Vision Standard (Gemini 3 Flash Compatible)

## Overview
This standard defines the "Vision Investigation Runtime" capability, inspired by Gemini 3 Flash's agentic vision mode. It enables deterministic, verifiable investigation of images via a Think -> Act -> Observe loop where the agent executes Python code.

## Capability Profile
*   **Mode**: Agentic Loop (Think -> Act -> Observe)
*   **Runtime**: Python Sandbox (Restricted)
*   **Inputs**: Image + Query
*   **Outputs**: Answer + Evidence Pack

## Evidence Contract
All executions must produce an Evidence Pack containing:
1.  **Trace**: Full history of steps (Think, Act, Observe).
2.  **Artifacts**: Derived images (crops, overlays) stored with unique IDs.
3.  **Metrics**: Structured JSON data (measurements, counts).

### Evidence Schema
```json
{
  "status": "success",
  "answer": "...",
  "history": [
    {"role": "llm", "content": "..."},
    {"role": "executor", "code": "...", "result": {...}}
  ],
  "evidence": {
    "image_path": "...",
    "variable_name": {
      "output_path": "...",
      "metrics": {...}
    }
  }
}
```

## Security Constraints
*   **Sandbox**: No network access, no file system access outside temp dir.
*   **Allowed Ops**: `math`, `crop_image`, `rotate_image`, `annotate_image`, `measure_distance`, `count_connected_components`.
*   **Budget**: Max 5 steps default.
