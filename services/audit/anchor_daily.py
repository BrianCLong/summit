#!/usr/bin/env python3
import datetime as dt
import hashlib
import os

import psycopg2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key


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
    key_pem = os.environ["AUDIT_ANCHOR_PRIVATE_KEY_PEM"].encode()
    key = load_pem_private_key(key_pem, password=None)
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(
        """select this_hash from audit_log
                   where at >= (now() - interval '24 hours') order by id"""
    )
    leaves = [r[0].encode() for r in cur.fetchall()]
    root = merkle(leaves)
    if not root:
        print("no new logs to anchor")
        return
    sig = key.sign(
        root,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256(),
    )
    cur.execute(
        """create table if not exists audit_anchors(
                     day date primary key, merkle_root bytea not null, signature bytea not null,
                     created_at timestamptz default now()
                   )"""
    )
    cur.execute(
        "insert into audit_anchors(day,merkle_root,signature) values (%s,%s,%s) on conflict (day) do nothing",
        (dt.datetime.utcnow().date(), psycopg2.Binary(root), psycopg2.Binary(sig)),
    )
    conn.commit()
    print("anchored:", root.hex())


if __name__ == "__main__":
    main()
