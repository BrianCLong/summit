import logging
from typing import Optional

try:
    from prov.model import ProvDocument
except ImportError:
    ProvDocument = None

logger = logging.getLogger(__name__)

def serialize_to_json(doc: ProvDocument) -> Optional[str]:
    """Serialize PROV document to JSON."""
    if not doc:
        return None
    return doc.serialize(format='json')

def serialize_to_xml(doc: ProvDocument) -> Optional[str]:
    """Serialize PROV document to XML."""
    if not doc:
        return None
    return doc.serialize(format='xml')

def serialize_to_rdf(doc: ProvDocument, format: str = 'turtle') -> Optional[str]:
    """Serialize PROV document to RDF (requires rdflib)."""
    if not doc:
        return None
    try:
        return doc.serialize(format=format)
    except Exception as e:
        logger.error(f"Failed to serialize to RDF: {e}")
        return None
