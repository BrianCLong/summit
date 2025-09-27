import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.graph_migration import (
    GraphConnectionConfig,
    GraphMigrator,
    GraphMigrationOptions,
    JanusGraphTranslator,
    build_workflow_action,
)
from tools.graph_migration import cli


@pytest.fixture
def neo4j_connections():
    source = GraphConnectionConfig(type='neo4j', uri='bolt://source:7687', database='neo4j')
    target = GraphConnectionConfig(type='neo4j', uri='bolt://target:7687', database='neo4j')
    return source, target


def test_graph_migrator_generates_cypher(neo4j_connections):
    source, target = neo4j_connections
    options = GraphMigrationOptions(
        labels=['Person'],
        relationship_types=['KNOWS'],
        id_property='uuid',
        output_prefix='test_migration',
    )
    migrator = GraphMigrator(source=source, target=target, options=options)

    export_statements = migrator.generate_export_cypher()
    import_statements = migrator.generate_import_cypher()

    assert 'CALL apoc.export.csv.query' in export_statements
    assert 'MATCH (n:`Person`)' in export_statements
    assert 'KNOWS' in export_statements

    assert 'CALL apoc.load.csv' in import_statements
    assert 'apoc.create.setLabels' in import_statements
    assert 'apoc.merge.relationship' in import_statements

    plan = migrator.build_plan().to_dict()
    assert plan['source']['uri'] == 'bolt://source:7687'
    assert plan['target']['uri'] == 'bolt://target:7687'
    assert plan['options']['idProperty'] == 'uuid'
    assert plan['metadata']['concurrency'] == options.concurrency


def test_build_workflow_action_contains_graph_migration_config(neo4j_connections):
    source, target = neo4j_connections
    action = build_workflow_action(
        name='migrate-graph',
        source=source,
        target=target,
        options=GraphMigrationOptions(labels=['Person']),
        command='plan',
        description='Plan a graph migration',
    )

    assert action['config']['actionType'] == 'graph-migration'
    assert action['config']['actionConfig']['source']['type'] == 'neo4j'
    assert action['config']['actionConfig']['options']['labels'] == ['Person']


def test_cli_plan_produces_json(capfd, neo4j_connections):
    source, target = neo4j_connections
    args = [
        'plan',
        '--source-type', source.type,
        '--source-uri', source.uri,
        '--source-database', source.database,
        '--target-type', target.type,
        '--target-uri', target.uri,
        '--target-database', target.database,
        '--label', 'Person',
        '--relationship-type', 'KNOWS',
    ]

    cli.main(args)
    captured = capfd.readouterr()
    payload = json.loads(captured.out)

    assert payload['source']['uri'] == source.uri
    assert payload['options']['labels'] == ['Person']
    assert 'exportStatements' in payload


def test_cli_export_and_import_output(neo4j_connections, capfd):
    source, target = neo4j_connections

    cli.main([
        'export',
        '--source-type', source.type,
        '--source-uri', source.uri,
        '--target-type', target.type,
        '--target-uri', target.uri,
    ])
    export_output = capfd.readouterr().out
    assert 'CALL apoc.export.csv.query' in export_output

    cli.main([
        'import',
        '--source-type', source.type,
        '--source-uri', source.uri,
        '--target-type', target.type,
        '--target-uri', target.uri,
        '--database', 'neo4j',
    ])
    import_output = capfd.readouterr().out
    assert 'CALL apoc.load.csv' in import_output
    assert 'apoc.merge.relationship' in import_output


def test_janusgraph_translation(tmp_path):
    graphson = {
        'vertices': [
            {
                'id': {'@type': 'g:Int64', '@value': 1},
                'label': 'person',
                'properties': {
                    'name': [{'value': {'@type': 'g:String', '@value': 'alice'}}],
                    'age': [{'value': {'@type': 'g:Int32', '@value': 32}}],
                },
            },
            {
                'id': {'@type': 'g:Int64', '@value': 2},
                'label': 'person',
                'properties': {
                    'name': [{'value': {'@type': 'g:String', '@value': 'bob'}}],
                },
            },
        ],
        'edges': [
            {
                'id': {'@type': 'g:Int64', '@value': 101},
                'label': 'knows',
                'outV': {'@type': 'g:Int64', '@value': 1},
                'inV': {'@type': 'g:Int64', '@value': 2},
                'properties': {'weight': {'@type': 'g:Double', '@value': 0.5}},
            }
        ],
    }
    graphson_path = tmp_path / 'janus.json'
    graphson_path.write_text(json.dumps(graphson))

    translator = JanusGraphTranslator.from_file(graphson_path)
    cypher = translator.to_cypher()

    assert 'UNWIND [' in cypher
    assert 'apoc.merge.relationship' in cypher
    assert '`migration_id`' in cypher

    return_code = cli.main([
        'translate-janusgraph',
        '--graphson', str(graphson_path),
    ])
    assert return_code == 0
