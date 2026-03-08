from typing import Any, Dict, Tuple

import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def leakage_safe_split_and_train(
    pipeline: Pipeline,
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42
) -> tuple[Pipeline, dict[str, Any], pd.DataFrame, pd.DataFrame]:
    """
    Ensures splitting is done BEFORE fitting to avoid test set data leakage.
    Returns: (fitted_pipeline, metrics, X_test, y_test)
    """
    if 'label' not in df.columns:
        raise ValueError("DataFrame must contain a 'label' column.")

    X = df[['text']] # Keep it as DataFrame for ColumnTransformer
    y = df['label']

    # SPLIT FIRST
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # FIT ONLY ON TRAIN
    pipeline.fit(X_train, y_train)

    # EVALUATE ON TEST
    y_pred = pipeline.predict(X_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_weighted": float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    }

    return pipeline, metrics, X_test, y_test
