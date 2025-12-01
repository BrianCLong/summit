import numpy as np

from mfue import (
    DatasetSplit,
    EvaluationReport,
    MFUEvaluator,
    MaskBasedUnlearningBaseline,
    FineTuneUnlearningBaseline,
    LogisticRegressionModel,
    ReproducibilityConfig,
)


def make_synthetic(seed: int = 13):
    rng = np.random.default_rng(seed)
    n_features = 4
    total = 400
    X = rng.normal(size=(total, n_features))
    true_w = np.array([1.2, -0.8, 0.6, -0.4])
    logits = X @ true_w
    probs = 1 / (1 + np.exp(-logits))
    y = (probs > 0.5).astype(int)
    forget_idx = np.arange(0, 40)
    retain_idx = np.arange(40, 320)
    holdout_idx = np.arange(320, total)
    return (
        LogisticRegressionModel(n_features=n_features, seed=seed),
        DatasetSplit(X[forget_idx], y[forget_idx], name="forget"),
        DatasetSplit(X[retain_idx], y[retain_idx], name="retain"),
        DatasetSplit(X[holdout_idx], y[holdout_idx], name="holdout"),
    )


def train_model(model: LogisticRegressionModel, retain: DatasetSplit, forget: DatasetSplit) -> None:
    X = np.vstack([retain.features, forget.features])
    y = np.concatenate([retain.labels, forget.labels])
    model.fit(X, y, steps=400, learning_rate=0.1, batch_size=64)


def test_finetune_baseline_reduces_forget_accuracy():
    model, forget, retain, holdout = make_synthetic()
    train_model(model, retain, forget)
    evaluator = MFUEvaluator(ReproducibilityConfig(seed=7, bootstrap_samples=200))
    baseline = FineTuneUnlearningBaseline(learning_rate=0.1, steps=150)
    result = evaluator.evaluate(
        model,
        forget_split=forget,
        retain_split=retain,
        holdout_split=holdout,
        baseline=baseline,
        seeds=[7],
    )
    assert result.forget_accuracy_drop > 0.05
    assert result.forget_significance_p < 0.05
    assert abs(result.holdout_accuracy_delta) <= 0.051
    report = evaluator.build_report(result)
    certification = report.certification()
    assert certification["residual_risk_band"] in {"low", "medium", "high"}
    assert isinstance(report.to_text(), str)


def test_mask_baseline_reduces_membership_auc():
    model, forget, retain, holdout = make_synthetic(seed=21)
    train_model(model, retain, forget)
    evaluator = MFUEvaluator(ReproducibilityConfig(seed=11, bootstrap_samples=150))
    baseline = MaskBasedUnlearningBaseline(mask_strength=4.0)
    result = evaluator.evaluate(
        model,
        forget_split=forget,
        retain_split=retain,
        holdout_split=holdout,
        baseline=baseline,
        seeds=[11],
    )
    assert result.membership_auc_drop > 0
    assert result.post_membership_auc < 0.7
    assert result.post_holdout_accuracy >= 0.85
