"""
DNS/WHOIS Infrastructure Connector

Connector for DNS records and WHOIS registration data.

⚠️ PRIVACY WARNING: WHOIS data contains PII. This connector implements
automatic PII detection and redaction in compliance with GDPR.

Usage:
    from connectors.dns_whois import map_dns_whois_to_intelgraph

    entities, relationships = map_dns_whois_to_intelgraph(
        ["example.com", "google.com"],
        config={"pii_redaction": "mask"}
    )
"""

from connectors.dns_whois.schema_mapping import map_dns_whois_to_intelgraph

__version__ = "1.0.0"
__all__ = ["map_dns_whois_to_intelgraph"]
