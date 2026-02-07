import json
import os
import shutil
from pathlib import Path

from plugins.materials.pipeline import redesign


def test_pipeline():
    # 1. Test flag OFF
    os.environ["SUMMIT_MATERIALS_REDESIGN"] = "0"
    res = redesign("junk", "test_run_0")
    assert res["rejected"][0]["reason"] == "feature_flag_off"
    print("Flag OFF check passed")

    # 2. Test flag ON
    os.environ["SUMMIT_MATERIALS_REDESIGN"] = "1"
    run_id = "test_run_1"

    # Cleanup previous run
    if Path(f"evidence/{run_id}").exists():
        shutil.rmtree(f"evidence/{run_id}")

    text = "LATTICE: 1.0 2.0 3.0\nSPECIES: Si\nCOORDS: 0.0 0.0 0.0"
    res = redesign(text, run_id)

    assert Path(f"evidence/{run_id}/report.json").exists()
    assert Path(f"evidence/{run_id}/metrics.json").exists()
    assert Path(f"evidence/{run_id}/stamp.json").exists()

    report = json.loads(Path(f"evidence/{run_id}/report.json").read_text())
    assert report["run_id"] == run_id
    assert report["inputs"]["structure_sha"]

    print("Flag ON check passed")

    # Cleanup
    if Path(f"evidence/{run_id}").exists():
        shutil.rmtree(f"evidence/{run_id}")

if __name__ == "__main__":
    test_pipeline()
