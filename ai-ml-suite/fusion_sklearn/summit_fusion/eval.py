from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .fusion import build_fusion_pipeline


def leakage_safe_split_and_fit(
    texts: list[str],
    labels: list[int],
    test_size: float = 0.2,
    random_state: int = 42,
    use_dummy_embeddings: bool = True
) -> tuple[Pipeline, dict]:
    """
    Enforces the 'split-before-fit' contract to prevent data leakage.
    Splits the data first, then builds the fusion pipeline, and fits ONLY on train.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=test_size, random_state=random_state, stratify=labels
    )

    feature_union = build_fusion_pipeline(use_dummy_embeddings=use_dummy_embeddings)

    pipeline = Pipeline([
        ('features', feature_union),
        ('clf', LogisticRegression(max_iter=2000, random_state=random_state))
    ])

    # Fit only on train!
    pipeline.fit(X_train, y_train)

    # Predict and evaluate on test
    y_pred = pipeline.predict(X_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro"))
    }

    return pipeline, metrics
