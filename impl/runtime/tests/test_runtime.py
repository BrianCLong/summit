import unittest
import asyncio
from impl.runtime.core import OrchestrationCore
from impl.runtime.serving import ModelServingLayer
# We can't easily test FastAPI app with unittest without TestClient from starlette/fastapi.testclient
# and installing dependencies. We'll stick to unit testing the classes for now.

class TestRuntime(unittest.TestCase):
    def setUp(self):
        self.orchestrator = OrchestrationCore()
        self.serving = ModelServingLayer()

    def test_serving_generation(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(self.serving.generate("Hello world", {}))
        self.assertEqual(result, "Processed: Hello world...")
        loop.close()

    def test_orchestrator_execution(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        request = {
            "messages": [{"role": "user", "content": "Hello world"}]
        }
        result = loop.run_until_complete(self.orchestrator.execute_request(request))
        self.assertEqual(result["choices"][0]["message"]["content"], "Processed: Hello world...")
        loop.close()

if __name__ == '__main__':
    unittest.main()
