from unittest import mock

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from summit_fusion.eval import leakage_safe_split_and_train
from summit_fusion.fusion import build_fusion_feature_union


def test_leakage_safe_split_before_fit():
    data = [
        {"text": "this is a normal text train_only_token 1", "label": 0},
        {"text": "another normal text train_only_token 2", "label": 1},
        {"text": "more text train_only_token 3", "label": 0},
        {"text": "this is for training train_only_token 4", "label": 1},
        {"text": "test_only_token_leakage_check something else", "label": 0},
        {"text": "test_only_token_leakage_check one more", "label": 1},
        {"text": "even more text train_only_token 5", "label": 0},
        {"text": "yep another one train_only_token 6", "label": 1},
        {"text": "train_only_token 7", "label": 0},
        {"text": "train_only_token 8", "label": 1},
    ]

    df = pd.DataFrame(data)

    with mock.patch('summit_fusion.eval.train_test_split') as mock_split:
        X_train = df.iloc[[0,1,2,3,6,7,8,9]][['text']]
        X_test = df.iloc[[4,5]][['text']]
        y_train = df.iloc[[0,1,2,3,6,7,8,9]]['label']
        y_test = df.iloc[[4,5]]['label']

        mock_split.return_value = (X_train, X_test, y_train, y_test)

        with mock.patch('summit_fusion.fusion.build_tfidf_svd_branch') as mock_tfidf:
            from summit_fusion.tfidf import build_tfidf_svd_branch
            mock_tfidf.return_value = build_tfidf_svd_branch(n_components=2)

            union = build_fusion_feature_union(embedding_transformer=None)
            pipeline = Pipeline([
                ("features", union),
                ("clf", LogisticRegression())
            ])

            fitted_pipeline, metrics, _, _ = leakage_safe_split_and_train(
                pipeline, df, test_size=0.2, random_state=42
            )

            col_trans = fitted_pipeline.named_steps['features']
            tfidf_pipeline = col_trans.named_transformers_['tfidf']
            vectorizer = tfidf_pipeline.named_steps['tfidf']

            vocab = vectorizer.vocabulary_

            assert "train_only_token" in vocab, "Training tokens should be in the fitted vocabulary"
            assert "test_only_token_leakage_check" not in vocab, "Leakage detected!"
