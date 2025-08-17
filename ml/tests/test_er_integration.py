import csv
from pathlib import Path

from ml.er import ERPipeline


def load_data():
    data_path = Path(__file__).resolve().parents[2] / "tests" / "data" / "er_eval.csv"
    records = {}
    pairs = []
    with data_path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            records[row["id1"]] = row["name1"]
            records[row["id2"]] = row["name2"]
            pairs.append((row["id1"], row["id2"], int(row["label"])))
    return records, pairs


def baseline_metrics(pairs, records):
    tp = fp = fn = 0
    for a, b, label in pairs:
        pred = records[a].lower() == records[b].lower()
        if pred and label:
            tp += 1
        elif pred and not label:
            fp += 1
        elif not pred and label:
            fn += 1
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    return precision, recall, f1


def test_pipeline_improves_over_baseline():
    records, pairs = load_data()
    base_p, base_r, base_f1 = baseline_metrics(pairs, records)

    pipeline = ERPipeline()
    pipeline.fit(records)
    pipeline.calibrate_threshold(pairs)

    tp = fp = fn = 0
    for a, b, label in pairs:
        score, _ = pipeline.score_pair(a, b)
        pred = score >= pipeline.threshold
        if pred and label:
            tp += 1
        elif pred and not label:
            fp += 1
        elif not pred and label:
            fn += 1
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0

    assert f1 >= base_f1 + 0.1
    assert precision >= base_p
    assert recall >= base_r
