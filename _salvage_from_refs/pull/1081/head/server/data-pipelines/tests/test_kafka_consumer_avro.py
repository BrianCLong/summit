import importlib.util
import json
import os
import sys
import types
import unittest
from functools import lru_cache
from io import BytesIO

from fastavro import schemaless_writer

base_dir = os.path.dirname(os.path.dirname(__file__))
package = types.ModuleType("connectors")
package.__path__ = [os.path.join(base_dir, "connectors")]
sys.modules["connectors"] = package
spec = importlib.util.spec_from_file_location(
    "connectors.kafka_consumer", os.path.join(base_dir, "connectors", "kafka_consumer.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
KafkaConnector = module.KafkaConnector


class DummyRegistry:
    def __init__(self, schemas):
        self.schemas = schemas

    def get_schema(self, schema_id):
        if schema_id not in self.schemas:
            raise Exception("schema not found")

        class Obj:
            def __init__(self, schema):
                self.schema = json.dumps(schema)

        return Obj(self.schemas[schema_id])


class TestKafkaConsumerAvro(unittest.TestCase):
    def setUp(self):
        config = {"value_deserializer": "avro"}
        self.connector = KafkaConnector("test", config)

    def _set_registry(self, schemas):
        self.connector.schema_registry_client = DummyRegistry(schemas)

        @lru_cache(maxsize=128)
        def _schema_cache(schema_id: int):
            obj = self.connector.schema_registry_client.get_schema(schema_id)
            return json.loads(obj.schema)

        self.connector._get_schema = _schema_cache

    def _encode(self, schema, record, schema_id=1, magic=b"\x00"):
        buf = BytesIO()
        buf.write(magic)
        buf.write(schema_id.to_bytes(4, "big"))
        schemaless_writer(buf, schema, record)
        return buf.getvalue()

    def test_valid_payload(self):
        schema = {"name": "Test", "type": "record", "fields": [{"name": "name", "type": "string"}]}
        record = {"name": "alice"}
        self._set_registry({1: schema})
        payload = self._encode(schema, record, 1)
        result = self.connector._deserialize_value(payload)
        self.assertEqual(result, record)

    def test_unknown_schema_id(self):
        schema = {"name": "Test", "type": "record", "fields": [{"name": "name", "type": "string"}]}
        record = {"name": "bob"}
        self._set_registry({})
        payload = self._encode(schema, record, 99)
        result = self.connector._deserialize_value(payload)
        self.assertEqual(result, payload)

    def test_bad_magic_byte(self):
        schema = {"name": "Test", "type": "record", "fields": [{"name": "name", "type": "string"}]}
        record = {"name": "carol"}
        self._set_registry({1: schema})
        payload = self._encode(schema, record, 1, magic=b"\x01")
        result = self.connector._deserialize_value(payload)
        self.assertEqual(result, payload)


if __name__ == "__main__":
    unittest.main()
