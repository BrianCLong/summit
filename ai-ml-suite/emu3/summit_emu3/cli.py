import argparse
import json
import os
import sys
from typing import Optional

from .adapter import Emu3BackendAdapter
from .backends.dummy import DummyBackend


def get_backend(backend_name: str) -> Emu3BackendAdapter:
    if backend_name == "dummy":
        return DummyBackend()
    elif backend_name == "hf":
        try:
            from .backends.hf_emu3 import Emu3HFBackend
            return Emu3HFBackend()
        except RuntimeError as e:
            print(f"Error initializing HF backend: {e}", file=sys.stderr)
            sys.exit(1)
        except ImportError as e:
            print(f"Error importing HF backend: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        raise ValueError(f"Unknown backend: {backend_name}")

def main():
    parser = argparse.ArgumentParser(description="Summit Emu3 Adapter CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Global args
    parser.add_argument("--backend", choices=["dummy", "hf"], default="dummy", help="Backend to use")
    parser.add_argument("--out", help="Output file path (default: stdout)")

    # Caption Command
    caption_parser = subparsers.add_parser("caption", help="Generate caption for image")
    caption_parser.add_argument("input", help="Path to input image/video")

    # VQA Command
    vqa_parser = subparsers.add_parser("vqa", help="Visual Question Answering")
    vqa_parser.add_argument("input", help="Path to input image/video")
    vqa_parser.add_argument("--question", required=True, help="Question to ask")

    # Consistency Command
    const_parser = subparsers.add_parser("video-consistency", help="Calculate video consistency score")
    const_parser.add_argument("input", help="Path to input video")

    args = parser.parse_args()

    backend = get_backend(args.backend)

    # Verify input exists
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.command == "caption":
            evidence = backend.generate_evidence(args.input, "caption")
        elif args.command == "vqa":
            evidence = backend.generate_evidence(args.input, "vqa", question=args.question)
        elif args.command == "video-consistency":
            evidence = backend.generate_evidence(args.input, "video-consistency")
        else:
            parser.print_help()
            sys.exit(1)

        output_json = evidence.model_dump_json(indent=2)

        if args.out:
            with open(args.out, "w") as f:
                f.write(output_json)
        else:
            print(output_json)

    except Exception as e:
        print(f"Error generating evidence: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
