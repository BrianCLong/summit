"""
CISA KEV Schema Mapping

Maps CISA Known Exploited Vulnerabilities catalog data to IntelGraph Vulnerability entities.

Reference: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
"""

import json
import httpx
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import logging

# PII detection integration
try:
    from services.ingest.ingest.app.pii import detect_pii
    PII_DETECTION_AVAILABLE = True
except ImportError:
    PII_DETECTION_AVAILABLE = False
    logging.warning("PII detection module not available")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CISA KEV API endpoint
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


def map_cisa_kev_to_intelgraph(
    file_path: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Maps CISA KEV data to IntelGraph Vulnerability entities.

    This function follows the standard IntelGraph connector contract:
    - Accepts optional file path or fetches from API
    - Returns (entities, relationships) tuple
    - Includes full provenance metadata
    - Integrates PII detection (though none expected)
    - Handles errors gracefully

    Args:
        file_path: Optional path to local KEV JSON file. If None, fetches from CISA API.
        config: Optional configuration dictionary with keys:
            - include_metadata: bool, include raw record in metadata (default: False)
            - filter_ransomware: bool, only include ransomware-associated vulns (default: False)
            - min_date: str (YYYY-MM-DD), only include vulns added after this date

    Returns:
        Tuple of:
            - entities: List of Vulnerability entity dictionaries
            - relationships: List of relationship dictionaries (empty for KEV)

    Raises:
        ValueError: If data format is invalid
        httpx.HTTPError: If API request fails
        FileNotFoundError: If file_path provided but doesn't exist

    Example:
        >>> entities, relationships = map_cisa_kev_to_intelgraph()
        >>> print(f"Ingested {len(entities)} vulnerabilities")
        Ingested 1234 vulnerabilities
    """
    config = config or {}
    include_metadata = config.get("include_metadata", False)
    filter_ransomware = config.get("filter_ransomware", False)
    min_date = config.get("min_date")

    # Load KEV data
    try:
        kev_data = _load_kev_data(file_path)
    except Exception as e:
        logger.error(f"Failed to load KEV data: {e}")
        raise

    # Validate schema
    _validate_kev_schema(kev_data)

    # Extract metadata
    catalog_version = kev_data.get("catalogVersion", "unknown")
    catalog_date = kev_data.get("dateReleased", "unknown")
    catalog_count = kev_data.get("count", 0)

    logger.info(
        f"Processing CISA KEV catalog version {catalog_version} "
        f"({catalog_count} vulnerabilities)"
    )

    # Map vulnerabilities to entities
    entities = []
    vulnerabilities = kev_data.get("vulnerabilities", [])

    for vuln in vulnerabilities:
        # Apply filters
        if filter_ransomware and not vuln.get("knownRansomwareCampaignUse", "Unknown").lower() == "known":
            continue

        if min_date:
            vuln_date = vuln.get("dateAdded", "")
            if vuln_date < min_date:
                continue

        # Map to entity
        entity = _map_vulnerability_to_entity(
            vuln,
            catalog_version,
            include_metadata
        )

        # PII detection (should find none, but validate)
        if PII_DETECTION_AVAILABLE:
            entity = _detect_and_mark_pii(entity)

        entities.append(entity)

    logger.info(f"Mapped {len(entities)} vulnerability entities")

    # KEV data has no relationships (just vulnerability entities)
    relationships = []

    return entities, relationships


def _load_kev_data(file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load KEV data from file or API.

    Args:
        file_path: Optional path to local JSON file

    Returns:
        Parsed KEV JSON data

    Raises:
        FileNotFoundError: If file doesn't exist
        httpx.HTTPError: If API request fails
        json.JSONDecodeError: If JSON is invalid
    """
    if file_path:
        logger.info(f"Loading KEV data from file: {file_path}")
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in file: {e}")
            raise ValueError(f"Invalid JSON format: {e}")
    else:
        logger.info(f"Fetching KEV data from CISA API: {CISA_KEV_URL}")
        try:
            response = httpx.get(CISA_KEV_URL, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch KEV data: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from API: {e}")
            raise ValueError(f"Invalid JSON from API: {e}")


def _validate_kev_schema(kev_data: Dict[str, Any]) -> None:
    """
    Validate KEV data schema.

    Args:
        kev_data: KEV JSON data

    Raises:
        ValueError: If schema is invalid
    """
    required_fields = ["catalogVersion", "dateReleased", "count", "vulnerabilities"]

    for field in required_fields:
        if field not in kev_data:
            raise ValueError(f"Missing required field in KEV data: {field}")

    if not isinstance(kev_data["vulnerabilities"], list):
        raise ValueError("vulnerabilities field must be a list")

    logger.debug("KEV schema validation passed")


def _map_vulnerability_to_entity(
    vuln: Dict[str, Any],
    catalog_version: str,
    include_metadata: bool = False
) -> Dict[str, Any]:
    """
    Map a single vulnerability to an IntelGraph Vulnerability entity.

    KEV Field Mapping:
    - cveID -> properties.cve_id
    - vendorProject -> properties.vendor_project
    - product -> properties.product
    - vulnerabilityName -> properties.name
    - dateAdded -> properties.discovered_date
    - shortDescription -> properties.description
    - requiredAction -> properties.remediation
    - dueDate -> properties.due_date
    - knownRansomwareCampaignUse -> properties.known_ransomware_use

    Args:
        vuln: Vulnerability dictionary from KEV data
        catalog_version: KEV catalog version
        include_metadata: Whether to include raw record in metadata

    Returns:
        IntelGraph Vulnerability entity
    """
    cve_id = vuln.get("cveID", "UNKNOWN")
    vuln_name = vuln.get("vulnerabilityName", cve_id)

    # Build entity
    entity = {
        "type": "Vulnerability",
        "properties": {
            # Core identifiers
            "id": cve_id,
            "cve_id": cve_id,
            "name": vuln_name,

            # Vendor/product info
            "vendor_project": vuln.get("vendorProject", ""),
            "product": vuln.get("product", ""),

            # Vulnerability details
            "vulnerability_name": vuln_name,
            "short_description": vuln.get("shortDescription", ""),
            "description": vuln.get("shortDescription", ""),  # Alias for compatibility

            # Timeline
            "date_added": vuln.get("dateAdded", ""),
            "discovered_date": vuln.get("dateAdded", ""),  # Alias
            "due_date": vuln.get("dueDate", ""),

            # Remediation
            "required_action": vuln.get("requiredAction", ""),
            "remediation": vuln.get("requiredAction", ""),  # Alias

            # Threat indicators
            "known_ransomware_use": _parse_ransomware_flag(
                vuln.get("knownRansomwareCampaignUse", "Unknown")
            ),

            # Source info
            "source": "cisa-kev",
            "confidence": 1.0,  # Authoritative source
            "data_classification": "public",

            # Catalog metadata
            "catalog_version": catalog_version,
        },
        "_metadata": {
            "ingestion_id": None,  # Set by orchestrator
            "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
            "connector_name": "cisa-kev",
            "connector_version": "1.0.0",
            "source_url": CISA_KEV_URL,
        }
    }

    # Optionally include raw record
    if include_metadata:
        entity["_metadata"]["raw_record"] = vuln

    return entity


def _parse_ransomware_flag(value: str) -> bool:
    """
    Parse ransomware campaign use flag.

    Args:
        value: String value from KEV data ("Known", "Unknown", etc.)

    Returns:
        Boolean flag
    """
    return value.lower() == "known"


def _detect_and_mark_pii(entity: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect and mark PII fields in entity.

    Although KEV data should not contain PII, we run detection as a best practice
    and to validate the PII detection integration.

    Args:
        entity: Vulnerability entity

    Returns:
        Entity with PII fields marked (if any found)
    """
    if not PII_DETECTION_AVAILABLE:
        return entity

    pii_fields = []

    for field, value in entity.get("properties", {}).items():
        if isinstance(value, str) and value:
            detected_types = detect_pii(value)
            if detected_types:
                pii_fields.append({
                    "field": field,
                    "pii_types": detected_types
                })
                logger.warning(
                    f"Unexpected PII detected in field '{field}': {detected_types}"
                )

    if pii_fields:
        entity["_metadata"]["_pii_fields"] = pii_fields

    return entity


def get_ransomware_vulnerabilities(
    file_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Convenience function to get only ransomware-associated vulnerabilities.

    Args:
        file_path: Optional path to local KEV JSON file

    Returns:
        List of Vulnerability entities with known ransomware use
    """
    entities, _ = map_cisa_kev_to_intelgraph(
        file_path=file_path,
        config={"filter_ransomware": True}
    )
    return entities


def get_recent_vulnerabilities(
    days: int = 30,
    file_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get vulnerabilities added in the last N days.

    Args:
        days: Number of days to look back
        file_path: Optional path to local KEV JSON file

    Returns:
        List of recent Vulnerability entities
    """
    from datetime import timedelta

    min_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    entities, _ = map_cisa_kev_to_intelgraph(
        file_path=file_path,
        config={"min_date": min_date}
    )
    return entities


# Example usage
if __name__ == "__main__":
    # Basic usage
    entities, relationships = map_cisa_kev_to_intelgraph()
    print(f"Ingested {len(entities)} vulnerabilities")

    # Ransomware filter
    ransomware_vulns = get_ransomware_vulnerabilities()
    print(f"Found {len(ransomware_vulns)} ransomware-associated vulnerabilities")

    # Recent vulnerabilities
    recent_vulns = get_recent_vulnerabilities(days=30)
    print(f"Found {len(recent_vulns)} vulnerabilities added in last 30 days")

    # Print first vulnerability
    if entities:
        print("\nSample vulnerability:")
        print(json.dumps(entities[0], indent=2))
