from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline


def build_tfidf_svd_branch(max_features: int = 5000, n_components: int = 300, random_state: int = 42) -> Pipeline:
    """
    Builds the TF-IDF + SVD branch of the fusion pipeline.
    Expects a list of strings as input.
    """
    return Pipeline([
        ('tfidf', TfidfVectorizer(max_features=max_features)),
        ('svd', TruncatedSVD(n_components=n_components, random_state=random_state))
    ])
