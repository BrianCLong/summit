import argparse
import json
import re
from pathlib import Path


def normalize(s):
    return re.sub(r"s+", " ", s).strip().lower()


def run(golden_path, results_path):
    g = [json.loads(l) for l in Path(golden_path).read_text().splitlines()]
    r = [json.loads(l) for l in Path(results_path).read_text().splitlines()]
    by_id = {x["id"]: x for x in r}
    ok = 0
    for row in g:
        got = normalize(by_id[row["id"]]["output"])
        want = normalize(row["expected"])
        if all(p in got for p in row.get("must_include", [])) and want in got:
            ok += 1
    print(json.dumps({"total": len(g), "pass": ok, "rate": ok / len(g)}))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden")
    ap.add_argument("--results")
    a = ap.parse_args()
    run(a.golden, a.results)
