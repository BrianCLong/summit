import os
import shutil
import subprocess
import json
from pathlib import Path

def test_determinism():
    test_dir = Path("ci/graphci/tests/tmp_determinism")
    if test_dir.exists():
        shutil.rmtree(test_dir)
    test_dir.mkdir(parents=True)

    evidence_id = "test-evidence-id"

    # Create a mock snapshot fixture
    fixtures_dir = test_dir / "fixtures"
    snapshots_dir = fixtures_dir / "snapshots"
    snapshots_dir.mkdir(parents=True)
    with open(snapshots_dir / "test_source.html", "w") as f:
        f.write("<html><body>Test Snapshot</body></html>")

    # Run the pipeline twice
    output1 = test_dir / "output1"
    output2 = test_dir / "output2"

    cmd = [
        "python3", "-m", "ci.graphci.src.graphci.run",
        "--registry", "ci/graphci/registry.yaml",
        "--evidence-id", evidence_id,
        "--fixtures-dir", str(fixtures_dir)
    ]

    env = os.environ.copy()
    env["PYTHONPATH"] = "."

    subprocess.run(cmd + ["--output-dir", str(output1)], env=env, check=True)
    subprocess.run(cmd + ["--output-dir", str(output2)], env=env, check=True)

    # Compare outputs (excluding stamp.json created_utc)
    dir1 = output1 / evidence_id
    dir2 = output2 / evidence_id

    files1 = sorted([f.relative_to(dir1) for f in dir1.glob("**/*") if f.is_file()])
    files2 = sorted([f.relative_to(dir2) for f in dir2.glob("**/*") if f.is_file()])

    assert files1 == files2

    for rel_path in files1:
        if rel_path.name == "stamp.json":
            # Compare stamp.json except for created_utc
            with open(dir1 / rel_path) as f:
                data1 = json.load(f)
            with open(dir2 / rel_path) as f:
                data2 = json.load(f)

            data1.pop("created_utc")
            data2.pop("created_utc")
            assert data1 == data2
        else:
            with open(dir1 / rel_path, "rb") as f:
                content1 = f.read()
            with open(dir2 / rel_path, "rb") as f:
                content2 = f.read()
            assert content1 == content2, f"Determinism failure in {rel_path}"

    print("Determinism test passed!")

    # Cleanup
    shutil.rmtree(test_dir)

if __name__ == "__main__":
    test_determinism()
