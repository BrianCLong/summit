# Cognitive Bias Detection System

**Module:** `intelgraph/` (Python)
**Status:** Production Ready

## Overview

The Cognitive Bias Detection System is a component designed to analyze decision-making contexts and identify potential cognitive biases. It operates on the principle of "Metacognition" — thinking about thinking.

## Architecture

The core component is the `BiasDetector` class in `intelgraph/cognitive_bias_detector.py`.
It uses a **Strategy Pattern** where individual detectors are registered for specific `BiasType`s.

### Supported Biases

1.  **Confirmation Bias:** Seeking only confirming evidence.
2.  **Availability Heuristic:** Relying on recent/memorable examples.
3.  **Anchoring Bias:** Failing to adjust sufficiently from an initial value.
4.  **Hindsight Bias:** "I knew it all along."
5.  **Optimism Bias:** Underestimating risk.
6.  **Loss Aversion:** Irrationally fearing loss over gain.
7.  **Status Quo Bias:** Preferring things to stay the same.
8.  **Overconfidence Effect:** Inflated self-assessment.
9.  **Sunk Cost Fallacy:** Throwing good money after bad.
10. **Framing Effect:** Influenced by presentation.

## Integration

To use the detector, you must construct a `decision_context` dictionary. The schema of this dictionary varies by detector.

```python
from intelgraph.cognitive_bias_detector import BiasDetector, BiasType

detector = BiasDetector()

# Example: Checking for Confirmation Bias
context = {
    "current_belief": True,
    "evidence": [
        {"supports": True},
        {"supports": True},
        {"supports": True},
        {"supports": False}
    ]
}

results = detector.detect_bias(context, agent_state={})
for res in results:
    print(f"Detected {res.bias_type}: {res.confidence_score}")
```

## Extension

To add a new bias:
1.  Add a new entry to `BiasType` enum.
2.  Implement a `_detect_new_bias(context, state)` method.
3.  Register it in `_register_default_bias_detectors`.

## Limitations

- **Heuristic-Based:** Detections are probabilistic estimates, not ground truth.
- **Context Dependency:** The quality of detection is entirely dependent on the richness of the `decision_context` provided. Garbage in, garbage out.
