import json

import jsonschema
import pytest

from summit.partitioning.config import PartitioningConfig
from summit.partitioning.shard_plan import ShardPlan


def test_shard_plan_defaults():
    plan = ShardPlan()
    assert plan.entity_domain is None
    assert plan.region is None
    assert plan.cross_shard_allowed is False
    assert plan.max_shards == 1

def test_config_defaults():
    config = PartitioningConfig()
    assert config.enabled is False
    assert config.shard_router == "off"
    assert config.region_routing == "off"
    assert config.cross_shard is False
    assert config.max_shards == 3

def test_shard_plan_serialization():
    plan = ShardPlan(entity_domain="users", region="us-east", max_shards=3, cross_shard_allowed=True)
    d = plan.to_dict()
    assert d["entity_domain"] == "users"
    assert d["region"] == "us-east"
    assert d["max_shards"] == 3
    assert d["cross_shard_allowed"] is True
    assert d["time"]["start"] is None

def test_schema_validation():
    with open("schemas/partitioning/shard_plan.schema.json") as f:
        schema = json.load(f)

    plan = ShardPlan(entity_domain="products", region="eu-west")
    jsonschema.validate(instance=plan.to_dict(), schema=schema)

    # Test invalid
    invalid_data = plan.to_dict()
    invalid_data["max_shards"] = 0 # minimum is 1
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_data, schema=schema)
