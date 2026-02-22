import json
import os
import pytest
import jsonschema
from summit.mgi.config import MGIConfig

def test_mgi_config_defaults():
    # Clear environment variables to test defaults
    original_env = dict(os.environ)
    keys_to_clear = [k for k in os.environ if k.startswith("MGI_")]
    for k in keys_to_clear:
        del os.environ[k]

    try:
        config = MGIConfig()
        assert config.enabled is False
        assert config.keyword_graph == "off"
        assert config.skeleton == "off"
        assert config.retriever == "vector_only"
        assert config.key_chunks_k == 200
        assert config.keyword_max_degree == 500
    finally:
        # Restore environment
        os.environ.update(original_env)

def test_mgi_config_override():
    os.environ["MGI_ENABLED"] = "1"
    os.environ["MGI_KEYWORD_GRAPH"] = "on"
    os.environ["MGI_KEY_CHUNKS_K"] = "50"

    try:
        config = MGIConfig()
        assert config.enabled is True
        assert config.keyword_graph == "on"
        assert config.key_chunks_k == 50
    finally:
        # Cleanup
        del os.environ["MGI_ENABLED"]
        del os.environ["MGI_KEYWORD_GRAPH"]
        del os.environ["MGI_KEY_CHUNKS_K"]

def test_mgi_index_schema_validation():
    schema_path = "summit/mgi/schemas/mgi_index.schema.json"
    with open(schema_path) as f:
        schema = json.load(f)

    valid_data = {
        "index_id": "idx-001",
        "created_at": "2025-01-01T00:00:00Z",
        "granularity": {
            "l2_skeleton": {
                "entities": 100,
                "relations": 200,
                "key_chunks": 10
            },
            "l1_keyword": {
                "keywords": 500,
                "edges": 1000
            }
        }
    }

    # Should not raise
    jsonschema.validate(instance=valid_data, schema=schema)

    invalid_data = {
        "index_id": "idx-001",
        # Missing created_at
        "granularity": {}
    }

    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_data, schema=schema)

def test_mgi_run_schema_validation():
    schema_path = "summit/mgi/schemas/mgi_run.schema.json"
    with open(schema_path) as f:
        schema = json.load(f)

    valid_data = {
        "run_id": "run-001",
        "config": {
            "enabled": True,
            "keyword_graph": "on",
            "skeleton": "off",
            "key_chunks_k": 100
        },
        "stats": {
            "total_chunks": 5000,
            "llm_calls": 50,
            "indexing_time_ms": 12000
        }
    }

    jsonschema.validate(instance=valid_data, schema=schema)
