from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict

from .providers.qwen3_asr_provider import Qwen3ASRProvider
from .security import redact_for_logs
from .types import ASRRequest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summit ASR CLI (Qwen3-ASR)")
    parser.add_argument("--audio", required=True)
    parser.add_argument(
        "--audio-type",
        required=True,
        choices=["path", "url", "base64", "ndarray"],
    )
    parser.add_argument("--language")
    parser.add_argument("--timestamps", action="store_true")
    parser.add_argument("--backend", default="transformers")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--attention-backend", default="auto")
    return parser.parse_args()


def main() -> int:
    if os.getenv("ASR_CLI_ENABLED", "0") != "1":
        raise SystemExit("CLI disabled by default (set ASR_CLI_ENABLED=1)")

    args = parse_args()
    request = ASRRequest(
        audio=args.audio,
        audio_type=args.audio_type,
        language=args.language,
        return_timestamps=args.timestamps,
        device=args.device,
        attention_backend=args.attention_backend
    )
    provider = Qwen3ASRProvider(backend=args.backend)

    try:
        result = provider.transcribe(request)
    except Exception as e:
        print(
            json.dumps(
                {"error": str(e), "request": redact_for_logs(asdict(request))},
                ensure_ascii=False,
            )
        )
        return 2

    print(json.dumps(asdict(result), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
