#!/usr/bin/env python3
"""Graph data deduplication utility for Neo4j.

This script reads a JSON configuration from STDIN describing how duplicate
nodes and relationships should be identified. It connects to the configured
Neo4j database, finds duplicate groups based on the provided rules, and merges
those duplicates using APOC refactor helpers.

The script is designed to be triggered by the Summit GraphQL API but can be run
manually for troubleshooting:

    echo '{"node_rules": [{"label": "Person", "match_attributes": ["externalId"]}]}' \
      | python3 server/python/graph_deduplication.py
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Sequence

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ClientError


class DeduplicationConfigError(ValueError):
    """Raised when the provided configuration is invalid."""


class DeduplicationExecutionError(RuntimeError):
    """Raised when the deduplication procedure fails."""


def _validate_identifier(name: str, kind: str) -> str:
    if not isinstance(name, str) or not name.strip():
        raise DeduplicationConfigError(f"{kind} must be a non-empty string")
    name = name.strip()
    if not all(ch.isalnum() or ch == '_' for ch in name):
        raise DeduplicationConfigError(
            f"{kind} '{name}' contains unsupported characters. "
            "Only alphanumeric characters and underscores are allowed."
        )
    return name


def _validate_attributes(attributes: Iterable[str], kind: str) -> List[str]:
    cleaned: List[str] = []
    for attr in attributes:
        cleaned.append(_validate_identifier(attr, f"{kind} attribute"))
    if not cleaned:
        raise DeduplicationConfigError(f"At least one attribute is required for {kind} deduplication")
    return cleaned


@dataclass
class NodeRule:
    label: str
    match_attributes: List[str]


@dataclass
class RelationshipRule:
    type: str
    match_attributes: List[str]


def _build_key_expression(identifier: str, attributes: Sequence[str]) -> str:
    parts = [f"coalesce(toString({identifier}.`{attr}`), '')" for attr in attributes]
    if len(parts) == 1:
        return parts[0]
    return " + '|' + ".join(parts)


def _normalise_node_rules(raw: Any) -> List[NodeRule]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise DeduplicationConfigError("node_rules must be an array")
    rules: List[NodeRule] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise DeduplicationConfigError("Each node rule must be an object")
        label = _validate_identifier(entry.get('label'), 'Node label')
        attributes = entry.get('match_attributes') or entry.get('matchAttributes')
        if attributes is None:
            raise DeduplicationConfigError(f"Node rule for label '{label}' must define match_attributes")
        rules.append(NodeRule(label=label, match_attributes=_validate_attributes(attributes, f"node '{label}'")))
    return rules


def _normalise_relationship_rules(raw: Any) -> List[RelationshipRule]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise DeduplicationConfigError("relationship_rules must be an array")
    rules: List[RelationshipRule] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise DeduplicationConfigError("Each relationship rule must be an object")
        rel_type = _validate_identifier(entry.get('type'), 'Relationship type')
        attributes = entry.get('match_attributes') or entry.get('matchAttributes')
        if attributes is None:
            raise DeduplicationConfigError(
                f"Relationship rule for type '{rel_type}' must define match_attributes"
            )
        rules.append(
            RelationshipRule(type=rel_type, match_attributes=_validate_attributes(attributes, f"relationship '{rel_type}'"))
        )
    return rules


def _fetch_node_duplicates(tx, rule: NodeRule):
    key_expr = _build_key_expression('n', rule.match_attributes)
    query = f"""
    MATCH (n:`{rule.label}`)
    WITH {key_expr} AS dedup_key, collect(n) AS nodes
    WHERE size(nodes) > 1 AND dedup_key <> ''
    RETURN dedup_key AS key, [node IN nodes | id(node)] AS node_ids, size(nodes) AS count
    ORDER BY count DESC, key ASC
    """
    return list(tx.run(query).data())


def _merge_node_group(tx, node_ids: Sequence[int]):
    if len(node_ids) < 2:
        return None
    query = """
    MATCH (n) WHERE id(n) IN $node_ids
    WITH collect(n) AS nodes
    CALL apoc.refactor.mergeNodes(
      nodes,
      {properties:'combine', mergeRels:true, mergeRelsProperties:'combine', produceAlerts:false}
    ) YIELD node
    RETURN id(node) AS canonical_id
    """
    record = tx.run(query, node_ids=list(node_ids)).single()
    return record['canonical_id'] if record else None


def _fetch_relationship_duplicates(tx, rule: RelationshipRule):
    key_expr = _build_key_expression('r', rule.match_attributes)
    query = f"""
    MATCH (start)-[r:`{rule.type}`]->(end)
    WITH id(start) AS start_id, id(end) AS end_id, {key_expr} AS dedup_key, collect(r) AS relationships
    WHERE size(relationships) > 1 AND dedup_key <> ''
    RETURN start_id, end_id, dedup_key AS key, [rel IN relationships | id(rel)] AS relationship_ids, size(relationships) AS count
    ORDER BY count DESC, key ASC
    """
    return list(tx.run(query).data())


def _merge_relationship_group(tx, relationship_ids: Sequence[int]):
    if len(relationship_ids) < 2:
        return None
    query = """
    MATCH ()-[r]->() WHERE id(r) IN $relationship_ids
    WITH collect(r) AS rels
    CALL apoc.refactor.mergeRelationships(rels, {properties:'combine'}) YIELD rel
    RETURN id(rel) AS canonical_id
    """
    record = tx.run(query, relationship_ids=list(relationship_ids)).single()
    return record['canonical_id'] if record else None


def _load_config() -> Dict[str, Any]:
    try:
        raw = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        raise DeduplicationConfigError(f"Invalid JSON configuration: {exc}") from exc
    if not isinstance(raw, dict):
        raise DeduplicationConfigError('Configuration must be a JSON object')
    return raw


def _connect_driver() -> Driver:
    uri = os.environ.get('NEO4J_URI')
    user = os.environ.get('NEO4J_USER')
    password = os.environ.get('NEO4J_PASSWORD')
    if not uri or not user or not password:
        raise DeduplicationConfigError('NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD environment variables must be set')
    return GraphDatabase.driver(uri, auth=(user, password))


def run_deduplication(driver: Driver, config: Dict[str, Any]) -> Dict[str, Any]:
    dry_run = bool(config.get('dry_run', False))
    database = config.get('database')
    node_rules = _normalise_node_rules(config.get('node_rules') or config.get('nodeRules'))
    relationship_rules = _normalise_relationship_rules(
        config.get('relationship_rules') or config.get('relationshipRules')
    )

    if not node_rules and not relationship_rules:
        raise DeduplicationConfigError('At least one node_rules or relationship_rules entry must be provided')

    summary: Dict[str, Any] = {
        'operation_id': config.get('operation_id') or str(uuid.uuid4()),
        'dry_run': dry_run,
        'started_at': datetime.now(timezone.utc).isoformat(),
        'node_summary': {
            'rules': [],
            'groups': [],
            'total_groups': 0,
            'duplicates_identified': 0,
            'merged': 0,
        },
        'relationship_summary': {
            'rules': [],
            'groups': [],
            'total_groups': 0,
            'duplicates_identified': 0,
            'merged': 0,
        },
        'logs': [],
    }

    def _with_session() -> Any:
        return driver.session(database=database) if database else driver.session()

    try:
        with _with_session() as session:
            for rule in node_rules:
                summary['node_summary']['rules'].append({'label': rule.label, 'match_attributes': rule.match_attributes})
                duplicates = session.execute_read(_fetch_node_duplicates, rule)
                summary['node_summary']['total_groups'] += len(duplicates)
                for group in duplicates:
                    summary['node_summary']['duplicates_identified'] += group['count']
                    group_info = {
                        'label': rule.label,
                        'key': group['key'],
                        'node_ids': group['node_ids'],
                        'count': group['count'],
                    }
                    if not dry_run:
                        canonical_id = session.execute_write(_merge_node_group, group['node_ids'])
                        group_info['canonical_node_id'] = canonical_id
                        summary['node_summary']['merged'] += max(group['count'] - 1, 0)
                        summary['logs'].append(
                            f"Merged {group['count']} nodes with key '{group['key']}' on label {rule.label}"
                        )
                    else:
                        summary['logs'].append(
                            f"Identified {group['count']} duplicate nodes with key '{group['key']}' on label {rule.label}"
                        )
                    summary['node_summary']['groups'].append(group_info)

            for rule in relationship_rules:
                summary['relationship_summary']['rules'].append(
                    {'type': rule.type, 'match_attributes': rule.match_attributes}
                )
                duplicates = session.execute_read(_fetch_relationship_duplicates, rule)
                summary['relationship_summary']['total_groups'] += len(duplicates)
                for group in duplicates:
                    summary['relationship_summary']['duplicates_identified'] += group['count']
                    group_info = {
                        'type': rule.type,
                        'key': group['key'],
                        'start_id': group['start_id'],
                        'end_id': group['end_id'],
                        'relationship_ids': group['relationship_ids'],
                        'count': group['count'],
                    }
                    if not dry_run:
                        canonical_id = session.execute_write(
                            _merge_relationship_group, group['relationship_ids']
                        )
                        group_info['canonical_relationship_id'] = canonical_id
                        summary['relationship_summary']['merged'] += max(group['count'] - 1, 0)
                        summary['logs'].append(
                            f"Merged {group['count']} relationships with key '{group['key']}' on type {rule.type}"
                        )
                    else:
                        summary['logs'].append(
                            f"Identified {group['count']} duplicate relationships with key '{group['key']}' on type {rule.type}"
                        )
                    summary['relationship_summary']['groups'].append(group_info)
    except ClientError as exc:  # Typically raised when APOC is unavailable
        raise DeduplicationExecutionError(str(exc)) from exc

    summary['completed_at'] = datetime.now(timezone.utc).isoformat()
    return summary


def main() -> int:
    try:
        config = _load_config()
        driver = _connect_driver()
        try:
            result = run_deduplication(driver, config)
        finally:
            driver.close()
        json.dump(result, sys.stdout)
        sys.stdout.flush()
        return 0
    except (DeduplicationConfigError, DeduplicationExecutionError) as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - defensive guard
        print(json.dumps({'error': f'Unexpected failure: {exc}'}), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
