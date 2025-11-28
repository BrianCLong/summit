# Frontier Alignment & Oversight Loop v0.1 Specification

## 1. Overview
This system provides a DPO/RLHF-style alignment stack with a model-in-the-loop oversight layer. It integrates with existing telemetry and data engines to create a feedback loop for continuous model improvement.

## 2. Components

### 2.1 Preference Store
- **Purpose**: Stores pairwise or listwise comparisons for training.
- **Schema**:
    - `pref_id`: Unique identifier.
    - `prompt`: The input prompt.
    - `candidates`: List of candidate responses (with tool/graph traces).
    - `chosen_idx`: Index of the chosen response.
    - `rejected_idx`: Index of the rejected response.
    - `rationale`: Explanation for the choice.
    - `safety_tags`: List of safety-related tags.
    - `metadata`: Source, timestamp, model versions.

### 2.2 Alignment Trainer
- **Purpose**: Fine-tunes models using preference data.
- **Algorithms**:
    - DPO (Direct Preference Optimization).
    - Extensible for RLHF (PPO) later.
- **Input**: Base model checkpoints.
- **Output**: Aligned model checkpoints.

### 2.3 Oversight Orchestrator
- **Purpose**: Manages the evaluation and filtering of model outputs.
- **Policies**:
    - **Fast Auto-Judge**: Lightweight LLM or heuristic for quick checks.
    - **High-Fidelity Judge**: Stronger LLM or human loop for complex cases.
    - **Escalation**: Rules to promote checks to higher tiers based on uncertainty or risk.
- **Inputs**: Telemetry from SRE evals, training metrics.

### 2.4 Policy & Safety Layer
- **Purpose**: Enforces hard constraints and safety rules.
- **Config**:
    - Allowed/disallowed behaviors.
    - Tool constraints.
    - Graph operation allowlists.

## 3. Interfaces

### Core APIs

```python
# Log preference data
def log_preference(prompt, candidates, chosen_idx, meta):
    pass

# Run an alignment step
def train_step(config_path):
    pass

# Oversight decision
def decide(prompt, draft_response, model_stats):
    pass
```

## 4. Data Flow
1.  **Generation**: Model generates candidates for a prompt.
2.  **Oversight**: Orchestrator evaluates candidates using policies.
3.  **Feedback**: Preferences are generated (auto or human) and stored.
4.  **Training**: Alignment Trainer consumes preferences to update the model.
