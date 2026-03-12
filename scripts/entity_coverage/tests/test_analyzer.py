import pytest
from unittest.mock import MagicMock, patch
from scripts.entity_coverage.lib.analyzer import EntityCoverageAnalyzer

@pytest.fixture
def mock_pg_conn():
    conn = MagicMock()
    return conn

@pytest.fixture
def mock_neo4j_driver():
    driver = MagicMock()
    return driver

def test_get_entity_counts(mock_pg_conn, mock_neo4j_driver):
    mock_cur = mock_pg_conn.cursor.return_value.__enter__.return_value
    mock_cur.fetchall.return_value = [('Person', 10), ('Org', 5)]

    analyzer = EntityCoverageAnalyzer(mock_pg_conn, mock_neo4j_driver)
    counts = analyzer._get_entity_counts(None)

    assert counts == {'Person': 10, 'Org': 5}

def test_get_document_coverage(mock_pg_conn, mock_neo4j_driver):
    mock_cur = mock_pg_conn.cursor.return_value.__enter__.return_value
    mock_cur.fetchone.return_value = (100, 80)

    analyzer = EntityCoverageAnalyzer(mock_pg_conn, mock_neo4j_driver)
    coverage = analyzer._get_document_coverage(None)

    assert coverage['total_documents'] == 100
    assert coverage['documents_with_entities'] == 80
    assert coverage['coverage_percentage'] == 80.0

def test_get_entity_deserts(mock_pg_conn, mock_neo4j_driver):
    mock_cur = mock_pg_conn.cursor.return_value.__enter__.return_value
    mock_cur.fetchall.return_value = [('uuid-1', 'Title 1', {'system': 'S1'})]

    analyzer = EntityCoverageAnalyzer(mock_pg_conn, mock_neo4j_driver)
    deserts = analyzer._get_entity_deserts(None)

    assert len(deserts) == 1
    assert deserts[0]['id'] == 'uuid-1'

    # Test with tenant_id to verify SQL syntax fix
    analyzer._get_entity_deserts("tenant-123")
    args, kwargs = mock_cur.execute.call_args
    query = args[0]
    assert "AND tenant_id =" in query
    assert query.index("AND tenant_id =") < query.index("LIMIT")

def test_get_entity_density(mock_pg_conn, mock_neo4j_driver):
    mock_cur = mock_pg_conn.cursor.return_value.__enter__.return_value
    # row: (average, bucket_0, bucket_1_5, bucket_6_10, bucket_11_20, bucket_21_plus)
    mock_cur.fetchone.return_value = (7.5, 1, 2, 1, 1, 1)

    analyzer = EntityCoverageAnalyzer(mock_pg_conn, mock_neo4j_driver)
    density = analyzer._get_entity_density(None)

    assert density['average_entities_per_doc'] == 7.5
    dist = density['distribution']
    assert dist['0'] == 1
    assert dist['1-5'] == 2
    assert dist['6-10'] == 1
    assert dist['11-20'] == 1
    assert dist['21+'] == 1

def test_get_kg_entity_counts(mock_pg_conn, mock_neo4j_driver):
    mock_session = mock_neo4j_driver.session.return_value.__enter__.return_value
    mock_result = [
        {"kind": "Person", "count": 100},
        {"kind": "Org", "count": 50}
    ]
    mock_session.run.return_value = mock_result

    analyzer = EntityCoverageAnalyzer(mock_pg_conn, mock_neo4j_driver)
    counts = analyzer._get_kg_entity_counts(None)

    assert counts == {"Person": 100, "Org": 50}
