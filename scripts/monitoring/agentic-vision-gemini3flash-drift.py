import logging
import os
import shutil
import sys
import tempfile

from PIL import Image

# Ensure python modules can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), "../../python"))

try:
    from intelgraph_py.vision_investigation.loop import LLMProvider, VisionInvestigationLoop
except ImportError:
    # Fallback if running from repo root
    sys.path.append("python")
    from intelgraph_py.vision_investigation.loop import LLMProvider, VisionInvestigationLoop

logging.basicConfig(level=logging.INFO)

class MockLLM:
    def generate_plan(self, query, context):
        if "image_path" in context and "crop" not in context:
            return "crop = crop_image(image_path, (0,0,10,10))"
        if "crop" in context:
            return "FINAL ANSWER: Done"
        return "FINAL ANSWER: Fail"

def main():
    print("Running Agentic Vision Drift Detection...")

    # 1. Setup Fixture
    temp_dir = tempfile.mkdtemp()
    img_path = os.path.join(temp_dir, "drift_test.png")
    img = Image.new('RGB', (100, 100), color = 'red')
    img.save(img_path)

    try:
        # 2. Run Loop
        loop = VisionInvestigationLoop(MockLLM())
        result = loop.run(img_path, "drift check")

        # 3. Validation
        if result["status"] != "success":
            print(f"FAIL: Status is {result['status']}")
            sys.exit(1)

        if "crop" not in result["evidence"]:
            print("FAIL: Missing crop evidence")
            sys.exit(1)

        metrics = result["evidence"]["crop"]["metrics"]
        if metrics["crop_size"] != (10, 10):
            print(f"FAIL: Expected crop size (10, 10), got {metrics['crop_size']}")
            sys.exit(1)

        print("SUCCESS: Drift check passed.")
        sys.exit(0)

    finally:
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    main()
