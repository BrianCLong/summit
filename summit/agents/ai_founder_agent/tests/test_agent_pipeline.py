import unittest
import os
from summit.agents.ai_founder_agent.agent import run_founder_agent

class TestFounderAgent(unittest.TestCase):
    def test_pipeline_runs(self):
        # Create a dummy fixture if it doesn't exist
        os.makedirs("tests/fixtures", exist_ok=True)
        with open("tests/fixtures/test_idea.md", "w") as f:
            f.write("test idea")

        run_founder_agent("tests/fixtures/test_idea.md")

        # assert report.json exists and valid
        self.assertTrue(os.path.exists("report.json"))

        # Clean up
        if os.path.exists("report.json"):
            os.remove("report.json")

if __name__ == "__main__":
    unittest.main()
