#!/usr/bin/env python3
import argparse
import collections
import json
import sys


def load_jsonl(path):
    fps = []
    with open(path) as f:
        for line in f:
            try:
                fps.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return fps

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True, help="baseline plan-fingerprints.jsonl")
    ap.add_argument("--candidate", required=True, help="newly sampled plan-fingerprints.jsonl")
    ap.add_argument("--novel-threshold", type=float, default=0.05, help="fail if novel rate > threshold")
    ap.add_argument("--min-count-rare", type=int, default=1, help="rare if count <= this in baseline")
    args = ap.parse_args()

    base = load_jsonl(args.baseline)
    cand = load_jsonl(args.candidate)

    base_set = set(r.get("fingerprint") for r in base if "fingerprint" in r)
    base_freq = collections.Counter(r.get("fingerprint") for r in base if "fingerprint" in r)
    cand_set = set(r.get("fingerprint") for r in cand if "fingerprint" in r)

    novel = sorted(list(cand_set - base_set))
    rare = sorted([fp for fp in cand_set if base_freq.get(fp,0) <= args.min_count_rare])

    novel_rate = (len(novel) / max(1, len(cand_set)))
    print("=== Neo4j Plan Fingerprint Diff ===")
    print(f"Baseline unique: {len(base_set)}")
    print(f"Candidate unique: {len(cand_set)}")
    print(f"Novel fingerprints: {len(novel)}")
    print(f"Rare (<= {args.min_count_rare} in baseline): {len(rare)}")
    if novel:
        print("\n-- Novel --")
        for fp in novel: print(fp)
    if rare:
        print("\n-- Rare --")
        for fp in rare: print(fp)

    # Exit codes: 0 = ok, 2 = novel exceeds threshold
    if novel_rate > args.novel_threshold:
        print(f"\nFAIL: novel_rate {novel_rate:.2%} > threshold {args.novel_threshold:.2%}")
        sys.exit(2)
    print("\nOK")
    sys.exit(0)

if __name__ == "__main__":
    main()
