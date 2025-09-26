"""CLI wrapper for the natural language graph processor."""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import asdict
from typing import Any, Dict

from .langchain_processor import NaturalLanguageGraphProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _load_payload() -> Dict[str, Any]:
    try:
        raw = sys.stdin.read() if not sys.argv[1:] else sys.argv[1]
        if not raw:
            return {}
        return json.loads(raw)
    except json.JSONDecodeError as exc:  # pragma: no cover - IO guard
        raise ValueError("Invalid JSON payload for NL query processor") from exc


def main() -> int:
    try:
        payload = _load_payload()
        prompt = str(payload.get("prompt", ""))
        tenant_id = str(payload.get("tenantId") or payload.get("tenant_id") or "").strip()
        limit = payload.get("limit")

        processor = NaturalLanguageGraphProcessor()
        result = processor.translate(prompt, tenant_id, limit=limit)
        json.dump(asdict(result), sys.stdout)
        sys.stdout.flush()
        return 0
    except Exception as exc:  # pragma: no cover - runtime guard
        logger.exception("Failed to process natural language query")
        json.dump({"error": str(exc)}, sys.stdout)
        sys.stdout.flush()
        return 1


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
