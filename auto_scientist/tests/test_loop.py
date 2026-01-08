import unittest

from auto_scientist.impl.src.generator import Generator
from auto_scientist.impl.src.oversight import Oversight


class TestLoop(unittest.TestCase):
    def test_oversight_rejection(self):
        over = Oversight()
        score, critique = over.evaluate("Create a pathogen", "policy")
        self.assertLess(score, 0.5)
        self.assertIn("Violates safety", critique)

    def test_oversight_approval(self):
        over = Oversight()
        score, critique = over.evaluate("Use graphene", "policy")
        self.assertGreater(score, 0.8)

    def test_refinement(self):
        gen = Generator()
        refined = gen.refine("Old", "Critique")
        self.assertIn("Refined", refined)
        self.assertIn("Critique", refined)


if __name__ == "__main__":
    unittest.main()
