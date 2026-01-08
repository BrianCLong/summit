# Frontier Alignment & Oversight Loop (FAOL) Method Specification

## 1. Overview

The Frontier Alignment & Oversight Loop (FAOL) is a method for automated scientific discovery that integrates a "model-in-the-loop" oversight layer to ensure generated hypotheses and experiments adhere to safety and alignment constraints. It combines automated hypothesis generation with a rigorous verification protocol.

## 2. Core Algorithm

The method proceeds in four distinct phases:

1.  **Generation**: An LLM generates a set of candidate scientific hypotheses.
2.  **Oversight**: A separate "Oversight Model" (or ensemble) evaluates each hypothesis against a set of safety and alignment policies (e.g., "Do not suggest dangerous pathogens").
3.  **Refinement**: Hypotheses that fail oversight are fed back into the Generator with critique for refinement.
4.  **Execution**: Approved hypotheses are converted into executable experiment plans (DAGs) and run.

## 3. Pseudocode

```python
def run_alignment_loop(topic, max_iterations=3):
    hypotheses = generate_hypotheses(topic)

    for i in range(max_iterations):
        approved = []
        for h in hypotheses:
            score, critique = oversight_model.evaluate(h, policy="safety_v1")
            if score > THRESHOLD:
                approved.append(h)
            else:
                # Refine based on critique
                new_h = refine_hypothesis(h, critique)
                hypotheses.append(new_h)

        if len(approved) >= REQUIRED_COUNT:
            return approved

    return approved # Return whatever passed

def execute_experiment(hypothesis):
    plan = generate_dag(hypothesis)
    results = experiment_runner.run(plan)
    return results
```

## 4. Complexity Analysis

- **Time Complexity**: O(N \* M), where N is the number of generated hypotheses and M is the number of oversight iterations. Each LLM call is effectively O(1) in terms of algorithm steps, but dominates latency.
- **Space Complexity**: O(N), storing the list of hypotheses and critiques.

## 5. System Architecture

- **Generator Agent**: High-creativity model (e.g., GPT-4-Turbo).
- **Oversight Agent**: High-reasoning/Safety-tuned model (e.g., Claude 3 Opus or specialized fine-tune).
- **Execution Engine**: Python-based DAG runner (Airflow or custom `psc-runner`).

## 6. Metrics

- **Safety Pass Rate**: Percentage of generated hypotheses that pass oversight on first attempt.
- **Refinement Success Rate**: Percentage of failed hypotheses that pass after refinement.
- **Execution Success Rate**: Percentage of approved hypotheses that execute without errors.
- **End-to-End Latency**: Total time from topic submission to experiment completion.

## 7. Failure Modes

- **Generator Hallucination**: LLM generates invalid or impossible experiments.
  - Mitigation: Structured output validation, domain-specific checks.
- **Oversight Bypass**: Adversarial prompts bypass safety checks.
  - Mitigation: Multi-model oversight, defense-in-depth policies.
- **Execution Timeout**: Experiments exceed resource limits.
  - Mitigation: Hard timeouts, resource quotas per experiment.
- **Refinement Loop**: Hypothesis stuck in infinite refinement.
  - Mitigation: Max iteration limits, early termination criteria.
