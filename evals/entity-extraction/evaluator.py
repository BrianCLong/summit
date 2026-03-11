import json
import argparse
from collections import defaultdict

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def normalize_text(text):
    return text.strip().lower()

def calculate_f1(precision, recall):
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall)

def evaluate(corpus_file, extracted_file, output_file):
    corpus_data = load_json(corpus_file)
    extracted_data = load_json(extracted_file)

    corpus_map = {doc["id"]: doc for doc in corpus_data}
    extracted_map = {doc["id"]: doc for doc in extracted_data}

    total_true_entities = 0
    total_extracted_entities = 0
    total_correct_entities = 0  # Matches text (normalized)
    total_correct_type = 0      # Matches text and type

    per_type_metrics = defaultdict(lambda: {"true": 0, "extracted": 0, "correct": 0})

    # Relationships
    total_true_rels = 0
    total_ext_rels = 0
    correct_rels = 0

    for doc_id, true_doc in corpus_map.items():
        if doc_id not in extracted_map:
            total_true_entities += len(true_doc.get("entities", []))
            total_true_rels += len(true_doc.get("relationships", []))
            for e in true_doc.get("entities", []):
                per_type_metrics[e.get("type", "UNKNOWN")]["true"] += 1
            continue

        ext_doc = extracted_map[doc_id]

        true_entities = true_doc.get("entities", [])
        ext_entities = ext_doc.get("entities", [])

        true_rels = true_doc.get("relationships", [])
        ext_rels = ext_doc.get("relationships", [])

        total_true_entities += len(true_entities)
        total_extracted_entities += len(ext_entities)

        total_true_rels += len(true_rels)
        total_ext_rels += len(ext_rels)

        # Build maps for true entities
        # text -> list of (id, type)
        true_text_to_info = defaultdict(list)
        true_id_to_text = {}
        for e in true_entities:
            norm_text = normalize_text(e["text"])
            true_text_to_info[norm_text].append((e["id"], e["type"]))
            true_id_to_text[e["id"]] = norm_text
            per_type_metrics[e.get("type", "UNKNOWN")]["true"] += 1

        # Evaluate extracted entities
        # We need to map ext entity id to true entity id to evaluate relationships
        ext_id_to_true_id = {}

        # Make a copy of true_text_to_info to consume
        available_true = {k: list(v) for k, v in true_text_to_info.items()}

        for ext_e in ext_entities:
            ext_type = ext_e.get("type", "UNKNOWN")
            per_type_metrics[ext_type]["extracted"] += 1

            norm_text = normalize_text(ext_e["text"])
            if norm_text in available_true and len(available_true[norm_text]) > 0:
                total_correct_entities += 1

                # Find best match (prefer type match)
                candidates = available_true[norm_text]
                best_idx = 0
                type_matched = False
                for i, (t_id, t_type) in enumerate(candidates):
                    if t_type == ext_type:
                        best_idx = i
                        type_matched = True
                        break

                t_id, t_type = candidates.pop(best_idx)

                ext_id_to_true_id[ext_e["id"]] = t_id

                if type_matched:
                    total_correct_type += 1
                    per_type_metrics[ext_type]["correct"] += 1

        # Evaluate relationships
        # A relationship is correct if source and target map to correct true entities and type matches
        true_rels_set = set()
        for r in true_rels:
            true_rels_set.add((r["source"], r["target"], r["type"]))

        for r in ext_rels:
            src_ext = r.get("source")
            tgt_ext = r.get("target")
            rel_type = r.get("type")

            if src_ext in ext_id_to_true_id and tgt_ext in ext_id_to_true_id:
                src_true = ext_id_to_true_id[src_ext]
                tgt_true = ext_id_to_true_id[tgt_ext]

                if (src_true, tgt_true, rel_type) in true_rels_set:
                    correct_rels += 1
                    # consume relationship to avoid double counting
                    true_rels_set.remove((src_true, tgt_true, rel_type))

    # Overall metrics
    precision = total_correct_entities / total_extracted_entities if total_extracted_entities > 0 else 0.0
    recall = total_correct_entities / total_true_entities if total_true_entities > 0 else 0.0
    f1 = calculate_f1(precision, recall)

    type_accuracy = total_correct_type / total_correct_entities if total_correct_entities > 0 else 0.0

    rel_precision = correct_rels / total_ext_rels if total_ext_rels > 0 else 0.0
    rel_recall = correct_rels / total_true_rels if total_true_rels > 0 else 0.0
    rel_f1 = calculate_f1(rel_precision, rel_recall)

    # Per-type metrics
    types_report = {}
    for t, counts in per_type_metrics.items():
        if counts["true"] == 0 and counts["extracted"] == 0:
            continue

        p = counts["correct"] / counts["extracted"] if counts["extracted"] > 0 else 0.0
        r = counts["correct"] / counts["true"] if counts["true"] > 0 else 0.0
        f = calculate_f1(p, r)

        types_report[t] = {
            "precision": p,
            "recall": r,
            "f1_score": f,
            "true_count": counts["true"],
            "extracted_count": counts["extracted"],
            "correct_count": counts["correct"]
        }

    report = {
        "aggregate": {
            "entities": {
                "total_ground_truth": total_true_entities,
                "total_extracted": total_extracted_entities,
                "correct_text_matches": total_correct_entities,
                "correct_type_matches": total_correct_type,
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "type_accuracy": type_accuracy
            },
            "relationships": {
                "total_ground_truth": total_true_rels,
                "total_extracted": total_ext_rels,
                "correct_matches": correct_rels,
                "precision": rel_precision,
                "recall": rel_recall,
                "f1_score": rel_f1
            }
        },
        "per_type_entities": types_report
    }

    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Report written to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate entity extraction")
    parser.add_argument("--corpus", required=True, help="Path to ground-truth corpus JSON")
    parser.add_argument("--extracted", required=True, help="Path to extracted data JSON")
    parser.add_argument("--output", required=True, help="Path to output report JSON")

    args = parser.parse_args()
    evaluate(args.corpus, args.extracted, args.output)
