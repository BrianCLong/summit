#!/usr/bin/env python3
from __future__ import annotations

import sys

from summit.providers.ollama import OllamaProvider


def check_health(base_url: str = 'http://localhost:11434') -> bool:
    provider = OllamaProvider(base_url=base_url, timeout_s=5.0, max_retries=0)
    try:
        status = provider.health()
        print(f"✅ Ollama healthcheck passed at {base_url}: {status['body']}")
        return True
    except Exception as exc:  # noqa: BLE001 - CLI healthcheck should report any failure
        print(f'❌ Ollama healthcheck failed at {base_url}: {exc}')
        return False


if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:11434'
    success = check_health(url)
    sys.exit(0 if success else 1)
