from typing import List, Dict, Set

def compute_f1(pred_set: Set[str], gold_set: Set[str]) -> float:
    if not pred_set or not gold_set:
        return 0.0
    tp = len(pred_set & gold_set)
    precision = tp / len(pred_set)
    recall = tp / len(gold_set)
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall)

def normalize_text(text: str) -> str:
    return text.lower().strip()

def evaluate_table(prediction: List[Dict[str, str]], ground_truth: List[Dict[str, str]]) -> Dict[str, float]:
    """
    Computes Item F1 and Row F1 for a predicted table against ground truth.
    Assumes prediction and ground truth have same columns/schema for simplicity,
    or we just match values.
    Paper implies structured output.
    """
    # Flatten items for Item F1
    pred_items = set()
    for row in prediction:
        for k, v in row.items():
            pred_items.add(f"{k}:{normalize_text(v)}")

    gold_items = set()
    for row in ground_truth:
        for k, v in row.items():
            gold_items.add(f"{k}:{normalize_text(v)}")

    item_f1 = compute_f1(pred_items, gold_items)

    # Row F1 (strict match of all columns in a row)
    # This is tricky because order might not matter.
    # We can try to match each pred row to a gold row.
    pred_rows = set()
    for row in prediction:
        # Create a canonical string representation
        row_str = "|".join(sorted([f"{k}:{normalize_text(v)}" for k,v in row.items()]))
        pred_rows.add(row_str)

    gold_rows = set()
    for row in ground_truth:
        row_str = "|".join(sorted([f"{k}:{normalize_text(v)}" for k,v in row.items()]))
        gold_rows.add(row_str)

    row_f1 = compute_f1(pred_rows, gold_rows)

    # Success Rate (SR) - strict
    # Paper definition might vary, but let's say SR=1 if Row F1 > 0 (found at least one correct row)
    # or if Item F1 is perfect. Let's stick to simple SR = 1.0 if row_f1 == 1.0 for now, or just track F1.
    # Actually, often SR is for the whole task. If item_f1 > threshold?
    # I'll just return F1s.

    return {
        "item_f1": item_f1,
        "row_f1": row_f1
    }
