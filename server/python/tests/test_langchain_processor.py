import json
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from nlq import NaturalLanguageGraphProcessor


def test_translates_person_query_with_search_term():
    processor = NaturalLanguageGraphProcessor()
    result = processor.translate('Show people named Alice!', 'tenant-1', limit=5)

    assert 'MATCH (node:Person)' in result.cypher
    assert 'tenantId' in result.cypher
    assert result.params['tenantId'] == 'tenant-1'
    assert result.params['limit'] == 5
    assert result.params['searchTerm'].lower() == 'alice'
    assert result.graphql is not None


def test_sanitizes_prompt_and_caps_limit():
    processor = NaturalLanguageGraphProcessor(default_limit=10, max_limit=50)
    result = processor.translate('Find users; DROP ALL;', 't-2', limit=200)

    assert 'DROP' not in result.cypher.upper()
    assert result.params['limit'] == 50
    assert result.warnings, 'Expected sanitation warning when prompt is cleaned.'


def test_to_json_round_trip():
    processor = NaturalLanguageGraphProcessor()
    result = processor.translate('List connections between vendors', 'tenant-3')

    payload = processor.to_json(result)
    parsed = json.loads(payload)
    assert parsed['cypher'] == result.cypher
    assert parsed['params']['tenantId'] == 'tenant-3'


def test_raises_when_prompt_empty_after_sanitization():
    processor = NaturalLanguageGraphProcessor()
    with pytest.raises(ValueError):
        processor.translate('!!!', 'tenant-4')
