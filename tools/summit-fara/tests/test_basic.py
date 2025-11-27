import unittest
import sys
import os

# Ensure src is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from summit_fara.agent.curriculum import CurriculumAgent
from summit_fara.agent.executor import ExecutorAgent

class TestSummitFara(unittest.TestCase):
    def test_curriculum_instantiation(self):
        agent = CurriculumAgent()
        # It should generate synthetic tasks if backlog not found
        tasks = agent.generate_tasks(count=1)
        self.assertTrue(len(tasks) > 0)
        self.assertIsNotNone(tasks[0].id)

    def test_executor_instantiation(self):
        agent = ExecutorAgent("config.json", use_intelgraph=False)
        self.assertIsNotNone(agent.browser)
        self.assertIsNotNone(agent.gh_cli)

if __name__ == '__main__':
    unittest.main()
