from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from summit_fusion.metadata import TextMetadataExtractor
from summit_fusion.tfidf import build_tfidf_svd_branch


def build_fusion_feature_union(embedding_transformer=None) -> ColumnTransformer:
    """
    Builds the ColumnTransformer feature fusion stack:
    1. 'text' -> TF-IDF + SVD
    2. 'text' -> Embeddings (if provided)
    3. 'text' -> Metadata generation -> StandardScaler

    Expects input to be a pandas DataFrame with a 'text' column.
    """

    transformers = [
        ('tfidf', build_tfidf_svd_branch(), 'text'),
        ('metadata', Pipeline([
            ('extract', TextMetadataExtractor()),
            ('scale', StandardScaler())
        ]), 'text')
    ]

    if embedding_transformer is not None:
        transformers.append(('embedding', embedding_transformer, 'text'))

    return ColumnTransformer(
        transformers=transformers,
        remainder='drop'
    )
