#!/usr/bin/env python3
"""Generate a self-heal patch plan using the Copilot router."""

import json
import os
import sys
from typing import Any, Dict

import requests

ROUTER_URL = os.environ.get("ROUTER_URL")
ROUTER_TOKEN = os.environ.get("ROUTER_TOKEN")

def call_router(summary: str) -> Dict[str, Any]:
    if not ROUTER_URL or not ROUTER_TOKEN:
        return {
            "text": "Self-heal router not configured.",
            "meta": {}
        }

    payload = {
        "prompt": f"CI failure summary:\n{summary}\n\nPropose a minimal patch plan with tests.",
        "requireCitations": False,
        "classification": "U"
    }

    response = requests.post(
        ROUTER_URL,
        headers={
            "Authorization": f"Bearer {ROUTER_TOKEN}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload),
        timeout=20
    )
    response.raise_for_status()
    return response.json()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: self_heal.py <summary-path>", file=sys.stderr)
        sys.exit(1)

    summary_path = sys.argv[1]
    with open(summary_path, "r", encoding="utf-8") as handle:
        summary = handle.read()

    result = call_router(summary)
    print("# Copilot Self-Heal Proposal\n")
    print(summary)
    print("\n---\n")
    print(result.get("text") or "No suggestion returned.")


if __name__ == "__main__":
    main()
