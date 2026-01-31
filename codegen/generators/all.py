from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from codegen.generators import feature_flags


def main() -> None:
    output_root_str = os.environ.get("SUMMIT_GENERATED_ROOT")
    output_root = Path(output_root_str) if output_root_str else ROOT
    print(f"Running all generators with output root: {output_root}")
    feature_flags.generate(output_root)


if __name__ == "__main__":
    main()
