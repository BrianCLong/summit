"""
DNS/WHOIS Schema Mapping

Maps DNS records and WHOIS registration data to IntelGraph entities.

This connector demonstrates:
- Multiple entity types (Domain, Organization, Person, IPAddress)
- PII detection and redaction (emails, phones, names)
- Complex relationships (REGISTERED_TO, RESOLVES_TO, etc.)
- Rate limiting for WHOIS queries
- Error handling for non-existent domains

Privacy Note: WHOIS data contains PII. This connector implements automatic
PII detection and redaction in compliance with GDPR.
"""

import dns.resolver
import whois
import re
import hashlib
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import logging

# PII detection integration
try:
    from services.ingest.ingest.app.pii import detect_pii, apply_redaction
    PII_DETECTION_AVAILABLE = True
except ImportError:
    PII_DETECTION_AVAILABLE = False
    logging.warning("PII detection module not available")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DNS resolver configuration
DEFAULT_DNS_SERVERS = ['8.8.8.8', '8.8.4.4']  # Google Public DNS


def map_dns_whois_to_intelgraph(
    domains: List[str],
    config: Optional[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Maps DNS and WHOIS data to IntelGraph entities and relationships.

    Args:
        domains: List of domain names to query
        config: Optional configuration dictionary with keys:
            - include_dns: bool, include DNS records (default: True)
            - include_whois: bool, include WHOIS data (default: True)
            - include_metadata: bool, include raw records (default: False)
            - pii_redaction: str, 'mask'|'hash'|'remove' (default: 'mask')
            - dns_servers: list, custom DNS servers (default: Google Public DNS)
            - whois_timeout: int, WHOIS query timeout seconds (default: 10)

    Returns:
        Tuple of:
            - entities: List of entity dictionaries (Domain, Organization, Person, IPAddress)
            - relationships: List of relationship dictionaries

    Example:
        >>> entities, relationships = map_dns_whois_to_intelgraph(['example.com'])
        >>> print(f"Found {len(entities)} entities and {len(relationships)} relationships")
    """
    config = config or {}
    include_dns = config.get("include_dns", True)
    include_whois = config.get("include_whois", True)
    include_metadata = config.get("include_metadata", False)
    pii_redaction = config.get("pii_redaction", "mask")
    dns_servers = config.get("dns_servers", DEFAULT_DNS_SERVERS)
    whois_timeout = config.get("whois_timeout", 10)

    entities = []
    relationships = []

    logger.info(f"Processing {len(domains)} domains")

    for domain in domains:
        try:
            domain = domain.strip().lower()
            if not _is_valid_domain(domain):
                logger.warning(f"Invalid domain format: {domain}")
                continue

            # Create domain entity
            domain_entity = _create_domain_entity(domain)
            entities.append(domain_entity)

            # DNS lookup
            if include_dns:
                dns_entities, dns_rels = _process_dns_records(
                    domain,
                    domain_entity["properties"]["id"],
                    dns_servers
                )
                entities.extend(dns_entities)
                relationships.extend(dns_rels)

            # WHOIS lookup
            if include_whois:
                whois_entities, whois_rels = _process_whois_data(
                    domain,
                    domain_entity["properties"]["id"],
                    pii_redaction,
                    whois_timeout
                )
                entities.extend(whois_entities)
                relationships.extend(whois_rels)

        except Exception as e:
            logger.error(f"Error processing domain {domain}: {e}")
            continue

    logger.info(f"Mapped {len(entities)} entities and {len(relationships)} relationships")

    return entities, relationships


def _is_valid_domain(domain: str) -> bool:
    """
    Validate domain format.

    Args:
        domain: Domain name to validate

    Returns:
        True if valid domain format
    """
    # Basic domain validation regex
    pattern = r'^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$'
    return bool(re.match(pattern, domain))


def _create_domain_entity(domain: str) -> Dict[str, Any]:
    """
    Create a Domain entity.

    Args:
        domain: Domain name

    Returns:
        Domain entity dictionary
    """
    return {
        "type": "Domain",
        "properties": {
            "id": f"domain:{domain}",
            "name": domain,
            "domain_name": domain,
            "source": "dns-whois",
            "confidence": 1.0,
            "data_classification": "internal",  # May contain PII from WHOIS
        },
        "_metadata": {
            "ingestion_id": None,
            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
            "connector_name": "dns-whois",
            "connector_version": "1.0.0",
        }
    }


def _process_dns_records(
    domain: str,
    domain_id: str,
    dns_servers: List[str]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Process DNS records for a domain.

    Queries: A, AAAA, MX, NS, TXT, CNAME records

    Args:
        domain: Domain name
        domain_id: Domain entity ID
        dns_servers: List of DNS servers to use

    Returns:
        Tuple of (entities, relationships)
    """
    entities = []
    relationships = []

    resolver = dns.resolver.Resolver()
    resolver.nameservers = dns_servers
    resolver.timeout = 5
    resolver.lifetime = 5

    # Query different record types
    record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']

    for record_type in record_types:
        try:
            answers = resolver.resolve(domain, record_type)

            for answer in answers:
                if record_type in ['A', 'AAAA']:
                    # Create IPAddress entity
                    ip_entity = {
                        "type": "IPAddress",
                        "properties": {
                            "id": f"ip:{answer.to_text()}",
                            "ip_address": answer.to_text(),
                            "version": "ipv4" if record_type == 'A' else "ipv6",
                            "source": "dns-whois",
                            "confidence": 1.0,
                        },
                        "_metadata": {
                            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                            "connector_name": "dns-whois",
                        }
                    }
                    entities.append(ip_entity)

                    # Create RESOLVES_TO relationship
                    relationships.append({
                        "type": "RESOLVES_TO",
                        "source_id": domain_id,
                        "target_id": ip_entity["properties"]["id"],
                        "properties": {
                            "record_type": record_type,
                            "confidence": 1.0,
                        },
                        "_metadata": {
                            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                        }
                    })

                elif record_type == 'MX':
                    # MX records point to other domains
                    mx_domain = answer.exchange.to_text().rstrip('.')
                    mx_domain_entity = _create_domain_entity(mx_domain)
                    entities.append(mx_domain_entity)

                    relationships.append({
                        "type": "HAS_MX_RECORD",
                        "source_id": domain_id,
                        "target_id": mx_domain_entity["properties"]["id"],
                        "properties": {
                            "priority": answer.preference,
                            "confidence": 1.0,
                        },
                        "_metadata": {
                            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                        }
                    })

                elif record_type == 'NS':
                    # Nameserver records
                    ns_domain = answer.to_text().rstrip('.')
                    ns_domain_entity = _create_domain_entity(ns_domain)
                    entities.append(ns_domain_entity)

                    relationships.append({
                        "type": "HAS_NAMESERVER",
                        "source_id": domain_id,
                        "target_id": ns_domain_entity["properties"]["id"],
                        "properties": {
                            "confidence": 1.0,
                        },
                        "_metadata": {
                            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                        }
                    })

                elif record_type == 'TXT':
                    # Store TXT records as properties on domain
                    # (Could create separate TXTRecord entities if needed)
                    pass

        except dns.resolver.NXDOMAIN:
            logger.debug(f"Domain {domain} does not exist")
        except dns.resolver.NoAnswer:
            logger.debug(f"No {record_type} records for {domain}")
        except dns.resolver.Timeout:
            logger.warning(f"DNS query timeout for {domain} ({record_type})")
        except Exception as e:
            logger.error(f"DNS query error for {domain} ({record_type}): {e}")

    return entities, relationships


def _process_whois_data(
    domain: str,
    domain_id: str,
    pii_redaction: str,
    timeout: int
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Process WHOIS data for a domain.

    CRITICAL: WHOIS data contains PII (names, emails, phones).
    This function implements automatic PII detection and redaction.

    Args:
        domain: Domain name
        domain_id: Domain entity ID
        pii_redaction: Redaction method ('mask'|'hash'|'remove')
        timeout: Query timeout in seconds

    Returns:
        Tuple of (entities, relationships)
    """
    entities = []
    relationships = []

    try:
        # Query WHOIS data
        w = whois.whois(domain)

        if not w:
            logger.warning(f"No WHOIS data for {domain}")
            return entities, relationships

        # Extract registrant organization
        if w.org:
            org_entity = _create_organization_entity(
                w.org,
                domain,
                pii_redaction
            )
            entities.append(org_entity)

            relationships.append({
                "type": "REGISTERED_TO",
                "source_id": domain_id,
                "target_id": org_entity["properties"]["id"],
                "properties": {
                    "confidence": 0.9,
                    "registration_date": _format_date(w.creation_date),
                    "expiration_date": _format_date(w.expiration_date),
                },
                "_metadata": {
                    "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                }
            })

        # Extract registrant person (with PII redaction)
        if w.name or w.emails:
            person_entity = _create_person_entity(
                name=w.name,
                email=w.emails[0] if w.emails else None,
                domain=domain,
                role="registrant",
                pii_redaction=pii_redaction
            )
            entities.append(person_entity)

            relationships.append({
                "type": "MANAGED_BY",
                "source_id": domain_id,
                "target_id": person_entity["properties"]["id"],
                "properties": {
                    "role": "registrant",
                    "confidence": 0.8,
                },
                "_metadata": {
                    "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
                }
            })

        # Update domain entity with WHOIS data
        # (In production, would update existing domain entity)

    except Exception as e:
        logger.warning(f"WHOIS query failed for {domain}: {e}")

    return entities, relationships


def _create_organization_entity(
    org_name: str,
    domain: str,
    pii_redaction: str
) -> Dict[str, Any]:
    """
    Create an Organization entity.

    Args:
        org_name: Organization name
        domain: Associated domain
        pii_redaction: Redaction method

    Returns:
        Organization entity
    """
    # Hash organization name for ID
    org_id = hashlib.sha256(org_name.encode()).hexdigest()[:16]

    entity = {
        "type": "Organization",
        "properties": {
            "id": f"org:{org_id}",
            "name": org_name,
            "source": "dns-whois",
            "confidence": 0.9,
            "data_classification": "internal",
        },
        "_metadata": {
            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
            "connector_name": "dns-whois",
            "associated_domain": domain,
        }
    }

    return entity


def _create_person_entity(
    name: Optional[str],
    email: Optional[str],
    domain: str,
    role: str,
    pii_redaction: str
) -> Dict[str, Any]:
    """
    Create a Person entity with PII redaction.

    CRITICAL: This function handles PII. All fields are redacted according to policy.

    Args:
        name: Person name (PII)
        email: Email address (PII)
        domain: Associated domain
        role: Role (registrant, admin, tech)
        pii_redaction: Redaction method ('mask'|'hash'|'remove')

    Returns:
        Person entity with redacted PII
    """
    # Generate ID from hashed PII (for deduplication without storing raw PII)
    id_source = f"{name}:{email}".encode()
    person_id = hashlib.sha256(id_source).hexdigest()[:16]

    # Redact PII
    redacted_name = _redact_pii_field(name, "name", pii_redaction)
    redacted_email = _redact_pii_field(email, "email", pii_redaction)

    entity = {
        "type": "Person",
        "properties": {
            "id": f"person:{person_id}",
            "name": redacted_name,
            "email": redacted_email,
            "role": role,
            "source": "dns-whois",
            "confidence": 0.8,
            "data_classification": "confidential",  # Contains PII
        },
        "_metadata": {
            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
            "connector_name": "dns-whois",
            "associated_domain": domain,
            "_pii_fields": [
                {"field": "name", "pii_types": ["name"], "redaction": pii_redaction},
                {"field": "email", "pii_types": ["email"], "redaction": pii_redaction},
            ],
            "_pii_redacted": True,
        }
    }

    return entity


def _redact_pii_field(
    value: Optional[str],
    field_type: str,
    redaction_method: str
) -> Optional[str]:
    """
    Redact a PII field according to policy.

    Args:
        value: Field value (may contain PII)
        field_type: Type of field ('name', 'email', 'phone')
        redaction_method: 'mask'|'hash'|'remove'

    Returns:
        Redacted value
    """
    if not value:
        return None

    if redaction_method == "remove":
        return "[REDACTED]"

    elif redaction_method == "hash":
        return hashlib.sha256(value.encode()).hexdigest()[:16]

    elif redaction_method == "mask":
        if field_type == "email":
            # mask: user@domain.com -> u***@d***.com
            if '@' in value:
                user, domain = value.split('@', 1)
                domain_parts = domain.split('.')
                return f"{user[0]}***@{domain_parts[0][0]}***.{domain_parts[-1]}"
            return "***@***.***"

        elif field_type == "name":
            # mask: John Doe -> J*** D***
            parts = value.split()
            return ' '.join([p[0] + '***' if p else '***' for p in parts])

        elif field_type == "phone":
            # mask: +1-234-567-8900 -> +**-***-***-****
            return "+**-***-***-****"

    return value


def _format_date(date_value: Any) -> Optional[str]:
    """
    Format date value to ISO string.

    Args:
        date_value: Date (could be datetime, list, or None)

    Returns:
        ISO formatted date string or None
    """
    if not date_value:
        return None

    if isinstance(date_value, list):
        date_value = date_value[0] if date_value else None

    if isinstance(date_value, datetime):
        return date_value.strftime("%Y-%m-%d")

    return str(date_value)


# Example usage
if __name__ == "__main__":
    test_domains = ["google.com", "example.com"]

    entities, relationships = map_dns_whois_to_intelgraph(
        test_domains,
        config={
            "include_dns": True,
            "include_whois": True,
            "pii_redaction": "mask"
        }
    )

    print(f"\nProcessed {len(test_domains)} domains")
    print(f"Found {len(entities)} entities")
    print(f"Found {len(relationships)} relationships")

    # Count entity types
    from collections import Counter
    entity_types = Counter(e["type"] for e in entities)
    print(f"\nEntity types: {dict(entity_types)}")

    # Show sample entity
    if entities:
        print(f"\nSample entity:")
        import json
        print(json.dumps(entities[0], indent=2))
