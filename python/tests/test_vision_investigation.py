import os
import shutil
import tempfile

import pytest
from intelgraph_py.vision_investigation.loop import VisionInvestigationLoop
from intelgraph_py.vision_investigation.sandbox import SafeExecutor
from intelgraph_py.vision_investigation.tools import crop_image, measure_distance, rotate_image
from PIL import Image


class MockLLM:
    def __init__(self, responses):
        self.responses = responses
        self.call_count = 0

    def generate_plan(self, query, context):
        if self.call_count < len(self.responses):
            resp = self.responses[self.call_count]
            self.call_count += 1
            return resp
        return "FINAL ANSWER: Unknown"

@pytest.fixture
def temp_image():
    temp_dir = tempfile.mkdtemp()
    img_path = os.path.join(temp_dir, "test.png")
    img = Image.new('RGB', (100, 100), color = 'red')
    img.save(img_path)
    yield img_path
    shutil.rmtree(temp_dir)

def test_crop_image(temp_image):
    result = crop_image(temp_image, (0, 0, 50, 50))
    assert "output_path" in result
    assert result["metrics"]["crop_size"] == (50, 50)
    assert os.path.exists(result["output_path"])
    # Determinism check: repeated calls should produce same output path
    result2 = crop_image(temp_image, (0, 0, 50, 50))
    assert result["output_path"] == result2["output_path"]

def test_rotate_image(temp_image):
    result = rotate_image(temp_image, 90)
    assert "output_path" in result
    # 100x100 rotated 90 is 100x100
    assert result["metrics"]["new_size"] == (100, 100)

def test_measure_distance(temp_image):
    result = measure_distance(temp_image, (0, 0), (3, 4))
    assert result["metrics"]["distance"] == 5.0

def test_sandbox_allowed():
    executor = SafeExecutor()
    code = "import math\nresult = math.sqrt(16)"
    res = executor.execute(code)
    # It might fail "import math" because "Import" is disallowed by AST check now!
    # Correct. AST check disallows ALL imports. math is pre-imported in globals.

    code2 = "result = math.sqrt(16)"
    res2 = executor.execute(code2)
    assert res2["result"] == 4.0

def test_sandbox_disallowed_imports():
    executor = SafeExecutor()
    code = "import os\nos.system('echo hack')"
    res = executor.execute(code)
    assert "error" in res
    assert "Security violation" in res["error"]
    assert "Import" in res["error"]

def test_sandbox_disallowed_from_imports():
    executor = SafeExecutor()
    code = "from os import system"
    res = executor.execute(code)
    assert "error" in res
    assert "Security violation" in res["error"]

def test_sandbox_disallowed_builtins():
    executor = SafeExecutor()
    # Attempt to use __import__
    code = "os = __import__('os')"
    res = executor.execute(code)
    # Should be caught by AST visitor checking for dunder calls or __import__
    if "error" in res:
        assert "Security violation" in res["error"]
    else:
        # Should fail with NameError if not caught by AST (but we removed it from builtins)
        raise AssertionError("Should have failed")

def test_loop_pixel_budget(temp_image):
    # Set a small budget
    # crop 10x10 = 100 pixels
    responses = ["crop = crop_image(image_path, (0,0,10,10))"]
    llm = MockLLM(responses)
    loop = VisionInvestigationLoop(llm)
    loop.MAX_PIXELS = 50 # 10x10 is 100 pixels, so this should fail

    result = loop.run(temp_image, "crop it")
    assert result["status"] == "budget_exceeded"

def test_loop_success(temp_image):
    responses = [
        "dist = measure_distance(image_path, (0,0), (3,4))",
        "FINAL ANSWER: The distance is 5"
    ]
    llm = MockLLM(responses)
    loop = VisionInvestigationLoop(llm)

    result = loop.run(temp_image, "measure something")

    assert result["status"] == "success"
    assert result["answer"] == "The distance is 5"
