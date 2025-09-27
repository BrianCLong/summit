import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Ensure the script module is importable
MODULE_ROOT = Path(__file__).resolve().parents[1]
if str(MODULE_ROOT) not in sys.path:
    sys.path.append(str(MODULE_ROOT))

import graph_deduplication as dedup  # noqa: E402  pylint: disable=wrong-import-position


def test_validate_identifier_rejects_invalid():
    with pytest.raises(dedup.DeduplicationConfigError):
        dedup._validate_identifier('Bad Label!', 'label')  # pylint: disable=protected-access


@pytest.mark.parametrize(
    'attributes,expected',
    [
        (['externalId'], "coalesce(toString(n.`externalId`), '')"),
        (
            ['externalId', 'name'],
            "coalesce(toString(n.`externalId`), '') + '|' + coalesce(toString(n.`name`), '')",
        ),
    ],
)
def test_build_key_expression(attributes, expected):
    expr = dedup._build_key_expression('n', attributes)  # pylint: disable=protected-access
    assert expr == expected


def test_normalise_node_rules_supports_camel_case():
    rules = dedup._normalise_node_rules(
        [{'label': 'Person', 'matchAttributes': ['externalId', 'name']}]
    )  # pylint: disable=protected-access
    assert len(rules) == 1
    assert rules[0].label == 'Person'
    assert rules[0].match_attributes == ['externalId', 'name']


def test_run_deduplication_merges_groups():
    node_groups = {
        'Person': [
            {'key': 'abc', 'node_ids': [1, 2], 'count': 2},
        ]
    }
    relationship_groups = {
        'ASSOCIATED_WITH': [
            {'key': 'rel', 'start_id': 1, 'end_id': 3, 'relationship_ids': [11, 12], 'count': 2},
        ]
    }

    session = MagicMock()

    def execute_read(func, rule):
        if isinstance(rule, dedup.NodeRule):
            tx = MagicMock()
            tx.run.return_value.data.return_value = node_groups.get(rule.label, [])
            return func(tx, rule)
        tx = MagicMock()
        tx.run.return_value.data.return_value = relationship_groups.get(rule.type, [])
        return func(tx, rule)

    def execute_write(func, identifiers):
        tx = MagicMock()
        tx.run.return_value.single.return_value = {'canonical_id': 99}
        return func(tx, identifiers)

    session.execute_read.side_effect = execute_read
    session.execute_write.side_effect = execute_write

    @contextmanager
    def session_cm(*_args, **_kwargs):
        yield session

    driver = MagicMock()
    driver.session.side_effect = session_cm

    result = dedup.run_deduplication(
        driver,
        {
            'node_rules': [{'label': 'Person', 'match_attributes': ['externalId']}],
            'relationship_rules': [{'type': 'ASSOCIATED_WITH', 'match_attributes': ['sourceId']}],
        },
    )

    assert result['node_summary']['merged'] == 1
    assert result['relationship_summary']['merged'] == 1
    assert any('Merged 2 nodes' in entry for entry in result['logs'])
    assert any('Merged 2 relationships' in entry for entry in result['logs'])


def test_run_deduplication_requires_rules():
    driver = MagicMock()
    with pytest.raises(dedup.DeduplicationConfigError):
        dedup.run_deduplication(driver, {})
