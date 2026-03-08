from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from graph_validator.config.types import (
    CanonicalizationConfig,
    EntityMapping,
    LinkMapping,
    Mapping,
    PerformanceConfig,
    RedactionConfig,
    SamplingConfig,
    SamplingNeo4jConfig,
    SamplingPgConfig,
    SloConfig,
)


class MappingError(ValueError):
    pass


def _require(value: Any, message: str) -> Any:
    if value is None:
        raise MappingError(message)
    return value


def _load_yaml(path: Path) -> dict[str, Any]:
    try:
        content = path.read_text(encoding='utf-8')
    except FileNotFoundError as exc:
        raise MappingError(f'Mapping file not found: {path}') from exc
    try:
        data = yaml.safe_load(content) or {}
    except yaml.YAMLError as exc:
        raise MappingError(f'Invalid YAML in {path}: {exc}') from exc
    if not isinstance(data, dict):
        raise MappingError('Mapping file must define a YAML object at the root.')
    return data


def _stringify_keys(raw: dict[Any, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in raw.items():
        normalized_key = 'null' if key is None else str(key)
        result[normalized_key] = value
    return result


def _parse_entities(raw: Any) -> list[EntityMapping]:
    if not isinstance(raw, list):
        raise MappingError('entities must be a list')
    entities: list[EntityMapping] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise MappingError('each entity entry must be a mapping')
        entities.append(
            EntityMapping(
                name=_require(entry.get('name'), 'entity name is required'),
                pg_table=_require(entry.get('pg_table'), 'entity pg_table is required'),
                pg_pk=_require(entry.get('pg_pk'), 'entity pg_pk is required'),
                neo4j_label=_require(
                    entry.get('neo4j_label'), 'entity neo4j_label is required'
                ),
                neo4j_key=_require(
                    entry.get('neo4j_key'), 'entity neo4j_key is required'
                ),
                props=list(entry.get('props') or []),
            )
        )
    return entities


def _parse_links(raw: Any) -> list[LinkMapping]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise MappingError('links must be a list')
    links: list[LinkMapping] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise MappingError('each link entry must be a mapping')
        links.append(
            LinkMapping(
                name=_require(entry.get('name'), 'link name is required'),
                pg_table=_require(entry.get('pg_table'), 'link pg_table is required'),
                pg_fk_from=_require(
                    entry.get('pg_fk_from'), 'link pg_fk_from is required'
                ),
                pg_fk_to=_require(entry.get('pg_fk_to'), 'link pg_fk_to is required'),
                neo4j_rel_type=_require(
                    entry.get('neo4j_rel_type'), 'link neo4j_rel_type is required'
                ),
                from_label=_require(
                    entry.get('from_label'), 'link from_label is required'
                ),
                to_label=_require(entry.get('to_label'), 'link to_label is required'),
                props=list(entry.get('props') or []),
            )
        )
    return links


def load_mapping(path: Path, tenant: Optional[str] = None) -> Mapping:
    data = _load_yaml(path)
    canonicalization_raw = _stringify_keys(data.get('canonicalization') or {})
    canonicalization = CanonicalizationConfig(**canonicalization_raw)
    sampling_raw = _stringify_keys(data.get('sampling') or {})
    sampling = SamplingConfig(
        per_entity=int(sampling_raw.get('per_entity', 5000)),
        per_link=int(sampling_raw.get('per_link', 10000)),
        pg=SamplingPgConfig(**_stringify_keys(sampling_raw.get('pg') or {})),
        neo4j=SamplingNeo4jConfig(**_stringify_keys(sampling_raw.get('neo4j') or {})),
    )
    performance = PerformanceConfig(**_stringify_keys(data.get('performance') or {}))
    redaction = RedactionConfig(**_stringify_keys(data.get('redaction') or {}))
    slo = SloConfig(**_stringify_keys(data.get('slo') or {}))
    entities = _parse_entities(_require(data.get('entities'), 'entities are required'))
    links = _parse_links(data.get('links'))
    return Mapping(
        version=int(_require(data.get('version'), 'version is required')),
        seed=str(_require(data.get('seed'), 'seed is required')),
        canonicalization=canonicalization,
        sampling=sampling,
        performance=performance,
        redaction=redaction,
        slo=slo,
        entities=entities,
        links=links,
        metadata=dict(data.get('metadata') or {}),
        tenant=tenant,
    )


def mapping_to_dict(mapping: Mapping) -> dict[str, Any]:
    result = asdict(mapping)
    return result
