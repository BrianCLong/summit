from typing import List, Dict, Any


class ESCILoader:
    """Loader stub for Amazon Shopping Queries (ESCI) dataset."""

    def __init__(self, data_path: str = None):
        self.data_path = data_path

    def load_queries(self) -> List[Dict[str, Any]]:
        """Stub: return sample queries if data_path is missing."""
        return [
            {"query_id": "q1", "query": "high protein dog food"},
            {"query_id": "q2", "query": "wireless noise cancelling headphones"}
        ]

    def load_products(self) -> List[Dict[str, Any]]:
        """Stub: return sample products if data_path is missing."""
        return [
            {
                "product_id": "p1",
                "product_title": "Blue Buffalo High Protein Dog Food",
                "product_description": "Natural dry dog food with chicken and brown rice.",
                "brand": "Blue Buffalo",
                "price": {"value": 50.0, "currency": "USD"}
            },
            {
                "product_id": "p2",
                "product_title": "Bose QuietComfort 45",
                "product_description": "Over-ear wireless headphones with world-class noise cancelling.",
                "brand": "Bose",
                "price": {"value": 329.0, "currency": "USD"}
            }
        ]
