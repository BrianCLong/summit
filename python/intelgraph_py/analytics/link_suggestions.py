"""Analytics helpers for transformer-based link suggestions."""

from ml.app.link_prediction import LinkPredictor, TransformerEmbedding


def generate_link_suggestions(
    nodes: list[str],
    edges: list[tuple[str, str]],
    source: str,
    top_k: int = 5,
):
    """Return top ``top_k`` suggested links for ``source``."""

    predictor = LinkPredictor(TransformerEmbedding())
    return predictor.suggest_links(nodes, edges, source, top_k)


__all__ = ["generate_link_suggestions"]
