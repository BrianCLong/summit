"""
CISA KEV (Known Exploited Vulnerabilities) Connector

Reference implementation demonstrating GA-level connector requirements.

Usage:
    from connectors.cisa_kev import map_cisa_kev_to_intelgraph, CISAKEVConnector

    # Simple mapping
    entities, relationships = map_cisa_kev_to_intelgraph()

    # Production connector
    connector = CISAKEVConnector(config={})
    stats = await connector.ingest()
"""

from connectors.cisa_kev.connector import CISAKEVConnector
from connectors.cisa_kev.schema_mapping import (
    get_ransomware_vulnerabilities,
    get_recent_vulnerabilities,
    map_cisa_kev_to_intelgraph,
)

__version__ = "1.0.0"
__all__ = [
    "CISAKEVConnector",
    "get_ransomware_vulnerabilities",
    "get_recent_vulnerabilities",
    "map_cisa_kev_to_intelgraph",
]
