from __future__ import annotations

from dataclasses import dataclass

GKG_MIN_COLUMNS = 10
GKG_FIELD_NAMES = [
    "gkg_record_id",
    "date",
    "source_collection_id",
    "source_common_name",
    "document_identifier",
    "counts",
    "themes",
    "locations",
    "persons",
    "organizations",
]


@dataclass(frozen=True)
class GKGRecord:
    gkg_record_id: str
    date: str
    source_collection_id: str
    source_common_name: str
    document_identifier: str
    counts: str
    themes: list[str]
    locations: list[str]
    persons: list[str]
    organizations: list[str]
    raw_fields: list[str]


def _split_list(value: str) -> list[str]:
    if not value:
        return []
    return [item for item in value.split(";") if item]


def parse_gkg_line(line: str) -> GKGRecord:
    fields = line.rstrip("\n").split("\t")
    if len(fields) < GKG_MIN_COLUMNS:
        raise ValueError(
            f"Expected at least {GKG_MIN_COLUMNS} columns, got {len(fields)}"
        )

    core = dict(zip(GKG_FIELD_NAMES, fields[:GKG_MIN_COLUMNS], strict=False))
    raw_fields = fields[GKG_MIN_COLUMNS:]

    return GKGRecord(
        gkg_record_id=core["gkg_record_id"],
        date=core["date"],
        source_collection_id=core["source_collection_id"],
        source_common_name=core["source_common_name"],
        document_identifier=core["document_identifier"],
        counts=core["counts"],
        themes=_split_list(core["themes"]),
        locations=_split_list(core["locations"]),
        persons=_split_list(core["persons"]),
        organizations=_split_list(core["organizations"]),
        raw_fields=raw_fields,
    )


def map_gkg_to_intelgraph(record: GKGRecord) -> tuple[list[dict], list[dict]]:
    entities: list[dict] = [
        {
            "type": "GDELT_Record",
            "properties": {
                "id": record.gkg_record_id,
                "date": record.date,
                "source_collection_id": record.source_collection_id,
                "source_common_name": record.source_common_name,
                "document_identifier": record.document_identifier,
                "counts": record.counts,
                "themes": record.themes,
                "locations": record.locations,
                "persons": record.persons,
                "organizations": record.organizations,
            },
        }
    ]
    relationships: list[dict] = []

    for theme in sorted(set(record.themes)):
        theme_id = f"theme:{theme}"
        entities.append({"type": "Theme", "properties": {"id": theme_id, "code": theme}})
        relationships.append(
            {
                "type": "MENTIONS",
                "source_id": record.gkg_record_id,
                "target_id": theme_id,
            }
        )

    for location in sorted(set(record.locations)):
        location_id = f"location:{location}"
        entities.append(
            {"type": "Location", "properties": {"id": location_id, "raw": location}}
        )
        relationships.append(
            {
                "type": "MENTIONS",
                "source_id": record.gkg_record_id,
                "target_id": location_id,
            }
        )

    return entities, relationships
