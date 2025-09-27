#!/usr/bin/env python3
"""Certificate-transparency style verifier for the IDTL log."""

import argparse
import base64
import hashlib
import json
import sys
from typing import Iterable, List
from urllib import request


def leaf_hash(data: bytes) -> bytes:
    return hashlib.sha256(b"\x00" + data).digest()


def node_hash(left: bytes, right: bytes) -> bytes:
    return hashlib.sha256(b"\x01" + left + right).digest()


def decode_proof(values: Iterable[str]) -> List[bytes]:
    return [base64.b64decode(v) for v in values]


def verify_inclusion(index: int, leaf: bytes, proof: List[bytes], root: bytes) -> bool:
    hash_value = leaf
    idx = index
    for sibling in proof:
        if idx % 2 == 0:
            hash_value = node_hash(hash_value, sibling)
        else:
            hash_value = node_hash(sibling, hash_value)
        idx //= 2
    return hash_value == root


def verify_consistency(old_size: int, new_size: int, old_root: bytes, new_root: bytes, proof: List[bytes]) -> bool:
    if old_size > new_size:
        return False
    if old_size == new_size:
        return old_root == new_root
    if old_size == 0:
        return True
    m_index = old_size - 1
    n_index = new_size - 1
    consumed = 0
    old_hash = None
    new_hash = None
    while m_index & 1:
        if consumed >= len(proof):
            return False
        old_hash = proof[consumed]
        new_hash = proof[consumed]
        consumed += 1
        m_index >>= 1
        n_index >>= 1
    if consumed >= len(proof):
        return False
    if old_hash is None:
        old_hash = proof[consumed]
        new_hash = proof[consumed]
        consumed += 1
    while consumed <= len(proof):
        if m_index & 1:
            if consumed >= len(proof):
                return False
            old_hash = node_hash(proof[consumed], old_hash)
            new_hash = node_hash(proof[consumed], new_hash)
            consumed += 1
        else:
            if consumed >= len(proof):
                break
            new_hash = node_hash(new_hash, proof[consumed])
            consumed += 1
        m_index >>= 1
        n_index >>= 1
        if m_index == 0:
            break
    return old_hash == old_root and new_hash == new_root


def fetch_leaf_hashes(endpoint: str, limit: int) -> List[bytes]:
    url = f"{endpoint.rstrip('/')}/tree/leaves?limit={limit}"
    with request.urlopen(url) as resp:
        if resp.status != 200:
            raise RuntimeError(f"unexpected status {resp.status}")
        payload = json.loads(resp.read().decode("utf-8"))
    return [base64.b64decode(item) for item in payload.get("leaf_hashes", [])]


def compute_root(leaves: List[bytes]) -> bytes:
    if not leaves:
        return b""
    nodes = [leaf[:] for leaf in leaves]
    while len(nodes) > 1:
        nxt: List[bytes] = []
        for idx in range(0, len(nodes), 2):
            if idx + 1 < len(nodes):
                nxt.append(node_hash(nodes[idx], nodes[idx + 1]))
            else:
                nxt.append(nodes[idx])
        nodes = nxt
    return nodes[0]


def command_inclusion(args: argparse.Namespace) -> int:
    if args.leaf_hash is None and args.leaf_data is None:
        print("provide --leaf-hash or --leaf-data", file=sys.stderr)
        return 1
    if args.leaf_hash is not None and args.leaf_data is not None:
        print("provide only one of --leaf-hash or --leaf-data", file=sys.stderr)
        return 1
    if args.leaf_hash is not None:
        leaf = base64.b64decode(args.leaf_hash)
    else:
        leaf = leaf_hash(args.leaf_data.encode("utf-8"))
    proof = decode_proof(args.proof)
    root = base64.b64decode(args.root)
    if verify_inclusion(args.index, leaf, proof, root):
        print("inclusion proof verified")
        return 0
    print("inclusion proof failed", file=sys.stderr)
    return 1


def command_consistency(args: argparse.Namespace) -> int:
    old_root = base64.b64decode(args.old_root)
    new_root = base64.b64decode(args.new_root)
    if args.endpoint:
        try:
            old_hashes = fetch_leaf_hashes(args.endpoint, args.old_size)
            new_hashes = fetch_leaf_hashes(args.endpoint, args.new_size)
        except Exception as exc:  # noqa: BLE001
            print(f"failed to fetch leaf hashes: {exc}", file=sys.stderr)
            return 1
        if compute_root(old_hashes) != old_root:
            print("recomputed old root does not match", file=sys.stderr)
            return 1
        if new_hashes[: args.old_size] != old_hashes:
            print("log prefix mismatch", file=sys.stderr)
            return 1
        if compute_root(new_hashes) != new_root:
            print("recomputed new root does not match", file=sys.stderr)
            return 1
        print("consistency verified using leaf hashes")
        return 0
    if not args.proof:
        print("provide --proof when endpoint is not supplied", file=sys.stderr)
        return 1
    proof = decode_proof(args.proof)
    if verify_consistency(args.old_size, args.new_size, old_root, new_root, proof):
        print("consistency proof verified")
        return 0
    print("consistency proof failed", file=sys.stderr)
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    inclusion = sub.add_parser("inclusion", help="verify an inclusion proof")
    inclusion.add_argument("--index", type=int, required=True)
    inclusion.add_argument("--proof", nargs="+", required=True, help="base64-encoded audit path")
    inclusion.add_argument("--root", required=True, help="base64-encoded log root")
    inclusion.add_argument("--leaf-hash", help="base64-encoded leaf hash")
    inclusion.add_argument("--leaf-data", help="raw leaf payload to hash")
    inclusion.set_defaults(func=command_inclusion)

    consistency = sub.add_parser("consistency", help="verify a consistency proof between two STHs")
    consistency.add_argument("--old-size", type=int, required=True)
    consistency.add_argument("--new-size", type=int, required=True)
    consistency.add_argument("--old-root", required=True, help="base64 root of the smaller tree")
    consistency.add_argument("--new-root", required=True, help="base64 root of the larger tree")
    consistency.add_argument("--proof", nargs="+", help="base64-encoded proof nodes")
    consistency.add_argument("--endpoint", help="IDTL endpoint to fetch leaf hashes from")
    consistency.set_defaults(func=command_consistency)

    return parser


def main(argv: List[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main(sys.argv[1:]))
