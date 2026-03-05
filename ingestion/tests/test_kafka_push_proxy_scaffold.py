import importlib.util
import sys
import os
import pathlib
import unittest

BASE_DIR = pathlib.Path(__file__).resolve().parents[1] / "kafka_push_proxy"


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, BASE_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


kpp_init = load_module("kpp_init", "__init__.py")
policy = load_module("kpp_policy", "policy.py")
producer = load_module("kpp_producer", "producer.py")
server = load_module("kpp_server", "server.py")


class KafkaPushProxyScaffoldTests(unittest.TestCase):
    def test_feature_flag_defaults_disabled(self):
        original = os.environ.pop("KAFKA_PUSH_PROXY_ENABLED", None)
        try:
            self.assertFalse(kpp_init.kafka_push_proxy_enabled())
        finally:
            if original is not None:
                os.environ["KAFKA_PUSH_PROXY_ENABLED"] = original

    def test_feature_flag_truthy_values_enable(self):
        original = os.environ.get("KAFKA_PUSH_PROXY_ENABLED")
        os.environ["KAFKA_PUSH_PROXY_ENABLED"] = "true"
        try:
            self.assertTrue(kpp_init.kafka_push_proxy_enabled())
        finally:
            if original is None:
                os.environ.pop("KAFKA_PUSH_PROXY_ENABLED", None)
            else:
                os.environ["KAFKA_PUSH_PROXY_ENABLED"] = original

    def test_policy_deny_by_default(self):
        denied = policy.evaluate_topic_allowlist("topic-b", {"topic-a"})
        self.assertFalse(denied.allowed)
        self.assertEqual("topic_not_allowlisted", denied.reason)

    def test_placeholder_handle_and_producer(self):
        request = server.PushRequest(
            source="edge-test",
            topic="raw.posts",
            payload={"message": "hello"},
            idempotency_key="abc-123",
        )

        response = server.handle_push(request)
        self.assertEqual("deferred", response["status"])

        produced = producer.produce_event(request.topic, request.payload)
        self.assertTrue(produced.accepted)


if __name__ == "__main__":
    unittest.main()
