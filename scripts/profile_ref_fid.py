import cProfile
import pstats
import io
import cv2
import numpy as np
from pipelines.reference_fidelity_eval.pipeline import ReferenceFidelityPipeline

def profile_pipeline():
    """
    Profiles the ReferenceFidelityPipeline using dummy data.
    """
    pipeline = ReferenceFidelityPipeline()

    target = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
    ref = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
    mask = np.zeros((512, 512), dtype=np.float32)
    mask[200:300, 200:300] = 1.0

    pipeline.evaluate(target, ref, mask)

if __name__ == "__main__":
    pr = cProfile.Profile()
    pr.enable()

    profile_pipeline()

    pr.disable()
    s = io.StringIO()
    sortby = 'cumulative'
    ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
    ps.print_stats()
    print(s.getvalue()[:1000]) # Print top 1000 chars of profiling info
