# Counterfactual Evaluation Harness (CEH)

CEH is a lightweight toolkit for probing machine learning models for
spurious correlations. It automates feature ablations, uplift analysis,
causal backdoor adjustments, and IRM-style penalties to highlight
model sensitivities and recommend guardrails.

## Quick start

```bash
python -m ceh report --dataset synthetic --model logistic --lambda-irm 1.0
```

Use `python -m ceh datasets` to list available demo datasets (synthetic and
breast cancer).

The CLI prints a reproducible JSON report. Provide `--output` to save it.

## Python API

```python
from sklearn.linear_model import LogisticRegression
from ceh import CounterfactualEvaluationHarness, load_synthetic_demo

dataset = load_synthetic_demo()
model = LogisticRegression(max_iter=1000, random_state=0)
harness = CounterfactualEvaluationHarness(model, dataset)
report = harness.run_full_evaluation(lambda_irm=1.0)
```

## Optional dependencies

CEH integrates with scikit-learn out of the box. XGBoost support is
available if the library is installed; otherwise the CLI will raise a
friendly error when requested.
