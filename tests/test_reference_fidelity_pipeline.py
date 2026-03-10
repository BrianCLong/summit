import unittest
import numpy as np
from pipelines.reference_fidelity_eval.pipeline import ReferenceFidelityPipeline

class TestReferenceFidelityPipeline(unittest.TestCase):

    def test_evaluate_dummy(self):
        target = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        ref = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        mask = np.zeros((100, 100))
        mask[40:60, 40:60] = 1.0

        pipeline = ReferenceFidelityPipeline()
        scores = pipeline.evaluate(target, ref, mask)

        self.assertIn("highfreq_similarity", scores)
        self.assertIn("attention_coverage", scores)
        self.assertIn("mask_containment", scores)
        self.assertIn("fidelity_score", scores)

        # Verify dummy metric values
        self.assertAlmostEqual(scores["attention_coverage"], 1.0)
        self.assertAlmostEqual(scores["mask_containment"], 1.0)

if __name__ == '__main__':
    unittest.main()
