import asyncio
import json
import os
import sys
import time

# Ensure we can import from summit
sys.path.append(os.getcwd())

from summit.providers.moonshot import MoonshotProvider


async def run_drift_check():
    api_key = os.environ.get("MOONSHOT_API_KEY")
    if not api_key:
        print("Skipping drift check: MOONSHOT_API_KEY not set")
        # Write a dummy metrics file so artifact verification doesn't fail in CI if keys are missing
        metrics = {
            "timestamp": time.time(),
            "skipped": True,
            "reason": "MOONSHOT_API_KEY not set"
        }
    else:
        provider = MoonshotProvider(api_key=api_key)

        tools = [{
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                        "unit": {"type": "string", "enum": ["c", "f"]}
                    },
                    "required": ["location"]
                }
            }
        }]

        messages = [{"role": "user", "content": "What's the weather in Tokyo?"}]

        start_time = time.time()
        try:
            response = await provider.chat_completion(messages, tools=tools)
            latency = time.time() - start_time

            # Validation
            choices = response.get("choices", [])
            if not choices:
                raise ValueError("No choices in response")

            message = choices[0].get("message", {})
            tool_calls = message.get("tool_calls", [])

            has_tool_call = len(tool_calls) > 0

            metrics = {
                "timestamp": time.time(),
                "latency": latency,
                "success": True,
                "tool_call_present": has_tool_call,
                "model": response.get("model", "unknown")
            }

        except Exception as e:
            metrics = {
                "timestamp": time.time(),
                "latency": time.time() - start_time,
                "success": False,
                "error": str(e)
            }

    # Ensure directory exists
    os.makedirs("artifacts/kimi-k2-5/drift", exist_ok=True)

    with open("artifacts/kimi-k2-5/drift/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("Drift check complete.")

if __name__ == "__main__":
    asyncio.run(run_drift_check())
