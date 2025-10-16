#!/usr/bin/env python3
import hashlib
import os

import psycopg2
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_public_key


def merkle(leaves):
    if not leaves:
        return b""
    L = [hashlib.sha256(x).digest() for x in leaves]
    while len(L) > 1:
        nxt = []
        for i in range(0, len(L), 2):
            a = L[i]
            b = L[i + 1] if i + 1 < len(L) else a
            nxt.append(hashlib.sha256(a + b).digest())
        L = nxt
    return L[0]


def main():
    dsn = os.environ["DATABASE_URL"]
    key_pem = os.environ["AUDIT_ANCHOR_PUBLIC_KEY_PEM"].encode()
    pub_key = load_pem_public_key(key_pem)
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute(
        "select day, merkle_root, signature from audit_anchors where day >= (now() - interval '3 days') order by day desc"
    )
    anchors = cur.fetchall()
    if len(anchors) < 3:
        print(f"FAIL: Found only {len(anchors)} anchors in the last 3 days.")
        exit(1)

    for day, root, sig in anchors:
        cur.execute("select this_hash from audit_log where at::date = %s order by id", (day,))
        leaves = [r[0].encode() for r in cur.fetchall()]
        recalculated_root = merkle(leaves)
        if root.tobytes() != recalculated_root:
            print(
                f"FAIL: Merkle root mismatch for {day}. DB: {root.hex()}, Recalculated: {recalculated_root.hex()}"
            )
            exit(1)
        try:
            pub_key.verify(
                sig.tobytes(),
                root.tobytes(),
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
                hashes.SHA256(),
            )
            print(f"OK: Anchor for {day} is valid.")
        except InvalidSignature:
            print(f"FAIL: Invalid signature for {day}.")
            exit(1)

    print("\nSUCCESS: All recent anchors verified.")


if __name__ == "__main__":
    main()
