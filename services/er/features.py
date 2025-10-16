# services/er/features.py
import re

import numpy as np


def normalize_name(s: str):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def pair_features(a: dict, b: dict):
    # a,b: claim dicts for same key category (e.g., package name, CVE, org)
    na, nb = normalize_name(a["value"]), normalize_name(b["value"])
    jacc = jaccard(set(na.split()), set(nb.split()))
    prefix = common_prefix(na, nb)
    return np.array([jacc, len(prefix) / max(len(na), 1)])


def jaccard(A, B):
    if not A and not B:
        return 1.0
    return len(A & B) / max(len(A | B), 1)


def common_prefix(a, b):
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]:
        i += 1
    return a[:i]
