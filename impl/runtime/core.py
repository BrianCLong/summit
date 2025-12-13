from typing import Any, Dict
from .serving import ModelServingLayer

class OrchestrationCore:
    def __init__(self):
        self.serving_layer = ModelServingLayer()
        print("OrchestrationCore initialized")

    async def execute_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a request by constructing and running an execution DAG.
        """
        messages = request.get("messages", [])

        # Simple passthrough to model serving for now
        last_message = messages[-1]["content"] if messages else ""
        generated_text = await self.serving_layer.generate(last_message, {})

        return {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1677652288,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": generated_text,
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 9,
                "completion_tokens": 12,
                "total_tokens": 21
            }
        }
