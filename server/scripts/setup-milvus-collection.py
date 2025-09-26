#!/usr/bin/env python3
"""One-time Milvus collection bootstrapper for Summit embeddings."""

from __future__ import annotations

import argparse
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'python'))

from vector.milvus_store import MilvusVectorStore  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or update the Milvus collection for Summit embeddings.")
    parser.add_argument("--collection", help="Override the default collection name", default=os.getenv("MILVUS_COLLECTION"))
    args = parser.parse_args()

    if args.collection:
        os.environ["MILVUS_COLLECTION"] = args.collection

    store = MilvusVectorStore()
    store.collection.flush()
    print(
        f"Milvus collection '{store.collection_name}' is ready with dimension {store.dimension} and index on '{store.vector_field}'."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
