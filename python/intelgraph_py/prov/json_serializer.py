import json

import prov.model


def serialize_document(doc: prov.model.ProvDocument) -> str:
    """Helper to serialize PROV document to JSON string."""
    return doc.serialize(format='json')

def deserialize_document(json_str: str) -> prov.model.ProvDocument:
    """Helper to deserialize JSON string to PROV document."""
    return prov.model.ProvDocument.deserialize(content=json_str, format='json')
