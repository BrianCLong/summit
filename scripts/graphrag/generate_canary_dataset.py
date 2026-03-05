#!/usr/bin/env python3
import hashlib
import json
import pathlib
import random
from dataclasses import asdict, dataclass

SEED = 1337
DOCS_OUT = pathlib.Path("artifacts/graphrag/corpus.jsonl")
META_OUT = pathlib.Path("artifacts/graphrag/meta.json")
random.seed(SEED)

@dataclass
class Doc:
    id: str
    title: str
    text: str
    tags: list

# Tiny canonical corpus (replace with your domain snippets)
SNIPPETS = [
  ("supply_chain", "SLSA and SBOM attestations form the evidence backbone of Summit releases."),
  ("governance", "Golden main enforces eight mandatory checks and CODEOWNERS protection."),
  ("graph", "IntelGraph stores entities and relations in Neo4j with strict provenance."),
  ("retrieval", "GraphRAG fuses neighborhood hops with dense vectors for robust recall."),
  ("ci", "Merge trains reduce queue thrash and stabilize throughput under PR surges."),
]

def mk_docs(n=100):
    docs = []
    for i in range(n):
        tag, base = random.choice(SNIPPETS)
        text = f"{base} Canonical note {i}."
        tid = hashlib.sha1(f"{SEED}-{i}-{tag}".encode()).hexdigest()[:12]
        docs.append(Doc(id=tid, title=f"{tag}-{i}", text=text, tags=[tag]))
    return docs

def main():
    DOCS_OUT.parent.mkdir(parents=True, exist_ok=True)
    docs = mk_docs(120)
    with open(DOCS_OUT, "w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(asdict(d), ensure_ascii=False) + "\n")
    meta = {
      "seed": SEED,
      "num_docs": len(docs),
      "embedding_model": "bge-small-en-v1.5",
      "tokenizer": "tokenizers==0.15.2",
      "notes": "Deterministic corpus; do not modify without bumping version."
    }
    META_OUT.write_text(json.dumps(meta, indent=2))
    print(f"Wrote {DOCS_OUT} and {META_OUT}")

if __name__ == "__main__":
    main()
