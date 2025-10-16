"""
OFAC SDN (Specially Designated Nationals) Connector for IntelGraph

Maps OFAC sanctions data to IntelGraph entities and relationships.
Handles individuals, organizations, vessels, and addresses from SDN lists.
"""

import hashlib
import json
import logging
from datetime import datetime

import pandas as pd

logger = logging.getLogger(__name__)


class OFACSdnMapper:
    """Maps OFAC SDN data to IntelGraph entities and relationships."""

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.sdn_list_url = self.config.get(
            "sdn_list_url", "https://www.treasury.gov/ofac/downloads/sdn.csv"
        )
        self.alt_names_url = self.config.get(
            "alt_names_url", "https://www.treasury.gov/ofac/downloads/alt.csv"
        )
        self.addresses_url = self.config.get(
            "addresses_url", "https://www.treasury.gov/ofac/downloads/add.csv"
        )

    def fetch_sdn_data(self) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Fetch SDN, alternative names, and addresses data from OFAC."""
        try:
            # Main SDN list
            sdn_df = pd.read_csv(self.sdn_list_url, encoding="latin-1")
            logger.info(f"Fetched {len(sdn_df)} SDN entries")

            # Alternative names
            alt_df = pd.read_csv(self.alt_names_url, encoding="latin-1")
            logger.info(f"Fetched {len(alt_df)} alternative names")

            # Addresses
            addr_df = pd.read_csv(self.addresses_url, encoding="latin-1")
            logger.info(f"Fetched {len(addr_df)} addresses")

            return sdn_df, alt_df, addr_df

        except Exception as e:
            logger.error(f"Failed to fetch OFAC data: {e}")
            raise

    def clean_text(self, text: str) -> str:
        """Clean and normalize text data."""
        if pd.isna(text):
            return ""
        return str(text).strip()

    def determine_entity_type(self, sdn_type: str, remarks: str = "") -> str:
        """Determine IntelGraph entity type from SDN type."""
        sdn_type = self.clean_text(sdn_type).upper()
        remarks = self.clean_text(remarks).upper()

        if sdn_type == "INDIVIDUAL" or "PERSON" in remarks:
            return "PERSON"
        elif sdn_type == "ENTITY" or "ORGANIZATION" in remarks:
            return "ORGANIZATION"
        elif "VESSEL" in sdn_type or "SHIP" in remarks:
            return "VESSEL"
        elif "AIRCRAFT" in sdn_type or "PLANE" in remarks:
            return "AIRCRAFT"
        else:
            return "ORGANIZATION"  # Default fallback

    def extract_sanctions_programs(self, programs: str) -> list[str]:
        """Extract and normalize sanctions programs."""
        if pd.isna(programs):
            return []

        # Common OFAC program codes
        program_codes = {
            "SDGT": "Global Terrorism",
            "CUBA": "Cuba Sanctions",
            "IRAN": "Iran Sanctions",
            "SYRIA": "Syria Sanctions",
            "IRAQ": "Iraq Sanctions",
            "LIBYA": "Libya Sanctions",
            "SDNTK": "Narcotics Trafficking",
            "BALKANS": "Western Balkans",
            "BELARUS": "Belarus Sanctions",
            "BURMA": "Burma Sanctions",
            "CAR": "Central African Republic",
            "CYBER2": "Cyber-related Sanctions",
            "DPRK": "North Korea Sanctions",
            "UKRAINE": "Ukraine-related Sanctions",
            "VENEZUELA": "Venezuela Sanctions",
        }

        programs_list = str(programs).split(";")
        normalized = []

        for program in programs_list:
            program = program.strip()
            if program in program_codes:
                normalized.append(program_codes[program])
            else:
                normalized.append(program)

        return normalized

    def generate_entity_id(self, sdn_id: str, name: str) -> str:
        """Generate stable entity ID."""
        # Use SDN ID as base, but add hash for uniqueness
        content = f"OFAC-SDN-{sdn_id}-{name}"
        return f"ofac-{hashlib.md5(content.encode()).hexdigest()[:12]}"

    def map_sdn_to_entities(self, sdn_df: pd.DataFrame) -> list[dict]:
        """Map SDN entries to IntelGraph entities."""
        entities = []

        for _, row in sdn_df.iterrows():
            try:
                entity_type = self.determine_entity_type(
                    row.get("SDN_TYPE", ""), row.get("REMARKS", "")
                )

                sanctions_programs = self.extract_sanctions_programs(row.get("PROGRAMS", ""))

                entity = {
                    "type": entity_type,
                    "properties": {
                        "id": self.generate_entity_id(
                            str(row.get("ENT_NUM", "")), self.clean_text(row.get("SDN_NAME", ""))
                        ),
                        "name": self.clean_text(row.get("SDN_NAME", "")),
                        "sdn_id": str(row.get("ENT_NUM", "")),
                        "sdn_type": self.clean_text(row.get("SDN_TYPE", "")),
                        "title": self.clean_text(row.get("TITLE", "")),
                        "sanctions_programs": sanctions_programs,
                        "remarks": self.clean_text(row.get("REMARKS", "")),
                        "list_type": "OFAC_SDN",
                        "data_source": "US Treasury OFAC",
                        "license": "public-domain",
                        "classification": "restricted",
                        "confidence": 0.95,  # High confidence for official data
                        "last_updated": datetime.now().isoformat(),
                        "sanctions_status": "ACTIVE",
                    },
                }

                # Add entity-specific properties
                if entity_type == "PERSON":
                    entity["properties"].update(
                        {"entity_category": "sanctioned_individual", "risk_level": "high"}
                    )
                elif entity_type == "ORGANIZATION":
                    entity["properties"].update(
                        {"entity_category": "sanctioned_organization", "risk_level": "high"}
                    )

                entities.append(entity)

            except Exception as e:
                logger.warning(f"Failed to process SDN entry {row.get('ENT_NUM', 'unknown')}: {e}")
                continue

        logger.info(f"Mapped {len(entities)} SDN entities")
        return entities

    def map_alternative_names(self, alt_df: pd.DataFrame, entities: list[dict]) -> list[dict]:
        """Map alternative names as relationships."""
        relationships = []
        entity_lookup = {e["properties"]["sdn_id"]: e["properties"]["id"] for e in entities}

        for _, row in alt_df.iterrows():
            try:
                sdn_id = str(row.get("ENT_NUM", ""))
                if sdn_id not in entity_lookup:
                    continue

                alt_name = self.clean_text(row.get("ALT_NAME", ""))
                if not alt_name:
                    continue

                # Create alias entity
                alias_entity = {
                    "type": "ALIAS",
                    "properties": {
                        "id": f"alias-{hashlib.md5(f'{sdn_id}-{alt_name}'.encode()).hexdigest()[:12]}",
                        "name": alt_name,
                        "alias_type": self.clean_text(row.get("ALT_TYPE", "aka")),
                        "data_source": "US Treasury OFAC",
                        "confidence": 0.90,
                        "last_updated": datetime.now().isoformat(),
                    },
                }

                # Create relationship
                relationship = {
                    "type": "HAS_ALIAS",
                    "source_id": entity_lookup[sdn_id],
                    "target_id": alias_entity["properties"]["id"],
                    "properties": {
                        "alias_type": self.clean_text(row.get("ALT_TYPE", "aka")),
                        "confidence": 0.90,
                        "data_source": "US Treasury OFAC",
                        "created_at": datetime.now().isoformat(),
                    },
                }

                entities.append(alias_entity)
                relationships.append(relationship)

            except Exception as e:
                logger.warning(f"Failed to process alternative name: {e}")
                continue

        logger.info(f"Created {len(relationships)} alias relationships")
        return relationships

    def map_addresses(self, addr_df: pd.DataFrame, entities: list[dict]) -> list[dict]:
        """Map addresses as location entities and relationships."""
        relationships = []
        entity_lookup = {
            e["properties"]["sdn_id"]: e["properties"]["id"]
            for e in entities
            if "sdn_id" in e["properties"]
        }

        for _, row in addr_df.iterrows():
            try:
                sdn_id = str(row.get("ENT_NUM", ""))
                if sdn_id not in entity_lookup:
                    continue

                # Build address string
                address_parts = []
                for field in [
                    "ADDRESS_1",
                    "ADDRESS_2",
                    "ADDRESS_3",
                    "CITY",
                    "STATE_PROVINCE",
                    "POSTAL_CODE",
                    "COUNTRY",
                ]:
                    part = self.clean_text(row.get(field, ""))
                    if part:
                        address_parts.append(part)

                if not address_parts:
                    continue

                full_address = ", ".join(address_parts)

                # Create address entity
                address_entity = {
                    "type": "LOCATION",
                    "properties": {
                        "id": f"addr-{hashlib.md5(f'{sdn_id}-{full_address}'.encode()).hexdigest()[:12]}",
                        "name": full_address,
                        "address_1": self.clean_text(row.get("ADDRESS_1", "")),
                        "address_2": self.clean_text(row.get("ADDRESS_2", "")),
                        "address_3": self.clean_text(row.get("ADDRESS_3", "")),
                        "city": self.clean_text(row.get("CITY", "")),
                        "state_province": self.clean_text(row.get("STATE_PROVINCE", "")),
                        "postal_code": self.clean_text(row.get("POSTAL_CODE", "")),
                        "country": self.clean_text(row.get("COUNTRY", "")),
                        "data_source": "US Treasury OFAC",
                        "confidence": 0.85,
                        "last_updated": datetime.now().isoformat(),
                        "location_type": "address",
                    },
                }

                # Create relationship
                relationship = {
                    "type": "LOCATED_AT",
                    "source_id": entity_lookup[sdn_id],
                    "target_id": address_entity["properties"]["id"],
                    "properties": {
                        "relationship_type": "address",
                        "confidence": 0.85,
                        "data_source": "US Treasury OFAC",
                        "created_at": datetime.now().isoformat(),
                    },
                }

                entities.append(address_entity)
                relationships.append(relationship)

            except Exception as e:
                logger.warning(f"Failed to process address: {e}")
                continue

        logger.info(f"Created {len(relationships)} address relationships")
        return relationships

    def add_provenance_metadata(self, entities: list[dict], relationships: list[dict]) -> None:
        """Add provenance metadata to all entities and relationships."""
        provenance = {
            "data_source": "US Treasury OFAC",
            "source_url": self.sdn_list_url,
            "license": "public-domain",
            "classification": "restricted",
            "ingestion_timestamp": datetime.now().isoformat(),
            "data_quality": "high",
            "update_frequency": "daily",
            "retention_period": "7-years",
            "compliance_required": True,
        }

        for entity in entities:
            entity["properties"]["provenance"] = provenance.copy()

        for relationship in relationships:
            relationship["properties"]["provenance"] = provenance.copy()


def map_ofac_sdn_to_intelgraph(config: dict = None) -> tuple[list[dict], list[dict]]:
    """
    Main function to map OFAC SDN data to IntelGraph format.

    Returns:
        Tuple of (entities, relationships)
    """
    mapper = OFACSdnMapper(config)

    try:
        # Fetch data
        sdn_df, alt_df, addr_df = mapper.fetch_sdn_data()

        # Map entities
        entities = mapper.map_sdn_to_entities(sdn_df)

        # Map relationships
        alias_relationships = mapper.map_alternative_names(alt_df, entities)
        address_relationships = mapper.map_addresses(addr_df, entities)

        all_relationships = alias_relationships + address_relationships

        # Add provenance
        mapper.add_provenance_metadata(entities, all_relationships)

        logger.info(
            f"Successfully mapped {len(entities)} entities and {len(all_relationships)} relationships"
        )

        return entities, all_relationships

    except Exception as e:
        logger.error(f"Failed to map OFAC SDN data: {e}")
        raise


if __name__ == "__main__":
    # Example usage for testing
    logging.basicConfig(level=logging.INFO)

    try:
        entities, relationships = map_ofac_sdn_to_intelgraph()

        print(f"Entities: {len(entities)}")
        print(f"Relationships: {len(relationships)}")

        # Print sample entities
        for i, entity in enumerate(entities[:3]):
            print(f"\nSample Entity {i+1}:")
            print(json.dumps(entity, indent=2, default=str))

        # Print sample relationships
        for i, rel in enumerate(relationships[:3]):
            print(f"\nSample Relationship {i+1}:")
            print(json.dumps(rel, indent=2, default=str))

    except Exception as e:
        print(f"Error: {e}")
