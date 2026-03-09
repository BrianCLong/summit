from __future__ import annotations

from typing import Any, Dict, List, Tuple

def reconcile_expected_vs_actual(expected: List[Dict[str, Any]], actual: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    """
    Semantic reconciliation to catch 'load succeeded but values are wrong/null' cases.
    This is crucial for detecting 'silent JSON ingestion failures' where the database
    might successfully load rows but with NULLs or default values instead of the real data.
    """
    problems: List[str] = []
    if len(expected) != len(actual):
        problems.append(f"ROWCOUNT expected={len(expected)} actual={len(actual)}")
        return False, problems

    for i, (e, a) in enumerate(zip(expected, actual)):
        for k, v in e.items():
            # Check if key exists in actual
            if k not in a:
                 problems.append(f"MISSING_KEY row={i} key={k}")
                 continue

            # Strict equality check
            if a.get(k) != v:
                problems.append(f"MISMATCH row={i} key={k} expected={v!r} actual={a.get(k)!r}")

    return len(problems) == 0, problems
