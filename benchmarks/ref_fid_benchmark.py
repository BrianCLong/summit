import json
import os
import cv2
import numpy as np
from pipelines.reference_fidelity_eval.pipeline import ReferenceFidelityPipeline

def run_benchmark(dataset, output_dir="reports/ref_fid_eval"):
    """
    Executes the reference-fidelity evaluation on a RefFidDataset.
    Outputs metrics.json and report.json.
    """
    os.makedirs(output_dir, exist_ok=True)

    pipeline = ReferenceFidelityPipeline()
    results = []

    for i in range(len(dataset)):
        sample = dataset[i]
        target_path = sample["target_image"]
        ref_path = sample["reference_image"]
        mask_path = sample["mask"]

        target_img = cv2.imread(target_path)
        ref_img = cv2.imread(ref_path)

        if mask_path:
            mask_img = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        else:
            # Default to full image if no mask provided
            mask_img = np.ones(target_img.shape[:2], dtype=np.uint8) * 255

        # Normalize mask to 0..1
        mask_float = mask_img / 255.0

        scores = pipeline.evaluate(target_img, ref_img, mask_float)

        results.append({
            "target": target_path,
            "reference": ref_path,
            "domain": sample.get("domain", "general"),
            "scores": scores
        })

    # Aggregate scores
    avg_hf = np.mean([r["scores"]["highfreq_similarity"] for r in results])
    avg_attn = np.mean([r["scores"]["attention_coverage"] for r in results])
    avg_cont = np.mean([r["scores"]["mask_containment"] for r in results])
    avg_fid = np.mean([r["scores"]["fidelity_score"] for r in results])

    metrics = {
        "overall_highfreq_similarity": avg_hf,
        "overall_attention_coverage": avg_attn,
        "overall_mask_containment": avg_cont,
        "overall_fidelity": avg_fid
    }

    # Write artifacts
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(output_dir, "report.json"), "w") as f:
        json.dump({"samples_evaluated": len(dataset), "results": results}, f, indent=2)

    with open(os.path.join(output_dir, "stamp.json"), "w") as f:
        json.dump({"timestamp": "0", "status": "completed"}, f)

    return metrics
