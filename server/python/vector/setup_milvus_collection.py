"""CLI utility for preparing the Milvus collection used by Summit."""

from __future__ import annotations

import argparse

from .milvus_store import MilvusVectorStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update the Milvus embedding collection")
    parser.add_argument("--collection", default="summit_embeddings", help="Collection name")
    parser.add_argument("--dim", type=int, default=None, help="Embedding dimension (required if collection does not exist)")
    parser.add_argument("--host", default=None, help="Milvus host or URI")
    parser.add_argument("--port", type=int, default=19530, help="Milvus port")
    parser.add_argument("--token", default=None, help="Milvus auth token")
    parser.add_argument("--alias", default="default", help="Connection alias")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    kwargs = {
        "collection_name": args.collection,
        "dim": args.dim,
        "host": args.host,
        "port": args.port,
        "token": args.token,
        "alias": args.alias,
    }
    store = MilvusVectorStore(**kwargs)
    store.collection.load()
    print(f"Collection '{args.collection}' ready with dim={store.dim}")


if __name__ == "__main__":
    main()
