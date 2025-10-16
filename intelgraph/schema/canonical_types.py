# intelgraph/schema/canonical_types.py

CANONICAL_ENTITY_TYPES = [
    "Person",
    "Org",
    "Asset",
    "Account",
    "Location",
    "Event",
    "Document",
    "Communication",
    "Device",
    "Vehicle",
    "Infra",
    "FinancialInstrument",
    "Indicator",
    "Claim",
    "Case",
    "Narrative",
    "Campaign",
    "Sensor",
    "Runbook",
    "Authority",
    "License",
]

# You can also define canonical relationship types here if needed
CANONICAL_RELATIONSHIP_TYPES = [
    "OWNS",
    "HAS_ACCOUNT",
    "LOCATED_AT",
    "PART_OF",
    "COMMUNICATED_WITH",
    "OBSERVED",
    "ISSUED_BY",
    "REFERENCES",
    "AFFECTS",
    "CONTROLS",
    "USES",
    "ASSOCIATED_WITH",
]
