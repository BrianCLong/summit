#!/usr/bin/env python3
"""Adversary Agent for generating MITRE ATT&CK TTP chains."""

import argparse
import asyncio
import json
import os
from datetime import datetime
from typing import Any

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - runtime import guard
    AsyncOpenAI = None  # type: ignore


class AdversaryAgent:
    """LLM-powered adversary simulation agent."""

    def __init__(self, temperature: float = 0.7, persistence: int = 3) -> None:
        self.temperature = temperature
        self.persistence = persistence
        api_key = os.getenv("OPENAI_API_KEY", "")
        self.client = AsyncOpenAI(api_key=api_key) if AsyncOpenAI else None

    async def generate_ttp_chain(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        """Generate a sequential TTP chain based on provided context."""
        if not self.client:
            raise RuntimeError("openai package not installed")

        prompt = (
            "You are an AI adversary agent simulating offensive tactics in a network.\n"
            f"Context: {json.dumps(context)}\n"
            "Generate a chain of 5-10 MITRE ATT&CK TTPs for lateral movement.\n"
            'Format each as JSON: {"technique_id": "TXXXX", "timestamp": "YYYY-MM-DDTHH:MM:SS", "intent": "description", "obfuscation_method": "method"}.\n'
            "Output as array."
        )

        for attempt in range(self.persistence):
            try:
                response = await self.client.chat.completions.create(
                    model="gpt-4-turbo",
                    messages=[{"role": "system", "content": prompt}],
                    temperature=self.temperature,
                    max_tokens=1000,
                )
                content = response.choices[0].message.content
                ttps = json.loads(content)
                for ttp in ttps:
                    ttp.setdefault("timestamp", datetime.utcnow().isoformat())
                return ttps
            except Exception:  # pragma: no cover - network errors
                if attempt == self.persistence - 1:
                    raise
                await asyncio.sleep(1)
        return []


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Generate adversarial TTP chains")
    parser.add_argument("--context", required=True, help="JSON encoded context")
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--persistence", type=int, default=3)
    args = parser.parse_args()

    context = json.loads(args.context)
    agent = AdversaryAgent(temperature=args.temperature, persistence=args.persistence)
    chain = await agent.generate_ttp_chain(context)
    print(json.dumps(chain, indent=2))


if __name__ == "__main__":
    asyncio.run(_main())
