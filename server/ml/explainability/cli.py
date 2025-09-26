"""Command line interface for entity explainability."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict

from .entity_explainer import EntityExplanationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _read_payload(stdin_fallback: bool = True) -> Dict[str, Any]:
    if not sys.stdin.isatty():
        data = sys.stdin.read().strip()
        if data:
            return json.loads(data)
    if stdin_fallback:
        return {}
    raise ValueError("No input provided")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate explainability for entity recognition outputs")
    parser.add_argument("--method", choices=["auto", "lime", "shap"], default=None)
    parser.add_argument("--top-k", type=int, default=None)
    parser.add_argument("--framework", default="pytorch")
    args = parser.parse_args()

    try:
        payload = _read_payload()
        text = payload.get("text", "")
        entities = payload.get("entities", [])
        options = payload.get("options", {})

        method = args.method or options.get("method")
        top_k = args.top_k or options.get("top_k", 5)
        framework = options.get("framework", args.framework)

        engine = EntityExplanationEngine(framework=framework)
        explanations = engine.explain_entities(text, entities, method=method, top_k=top_k)

        output = {
            "success": True,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "usedMethod": engine.last_used_method,
            "explanations": explanations,
        }
        json.dump(output, sys.stdout)
    except Exception as exc:  # pragma: no cover - defensive output for CLI usage
        logger.error("Explainability generation failed: %s", exc)
        json.dump({
            "success": False,
            "error": str(exc),
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "usedMethod": "error",
            "explanations": [],
        }, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
