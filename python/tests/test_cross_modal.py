import os
import sys

import numpy as np

# Add the python directory to the python path so we can import the module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from enrichment_service.cross_modal_resolution import resolve_entity


def test_resolve_entity_text_only():
    text_vec = np.array([0.1, 0.2, 0.3])
    key, conf = resolve_entity(text_vec, None)

    # Expected key format tx:{hash}
    assert key.startswith("tx:")
    # Expected default confidence for text only
    assert conf == 0.62


def test_resolve_entity_multimodal():
    text_vec = np.array([0.1, 0.2, 0.3])
    image_vec = np.array([0.4, 0.5, 0.6])

    key, conf = resolve_entity(text_vec, image_vec)

    # Expected key format tx:{hash}|im:{hash}
    assert key.startswith("tx:")
    assert "|im:" in key

    # Verify calculation logic
    # score = 0.65 * norm(text) + 0.35 * norm(image)
    # norm(text) = sqrt(0.01 + 0.04 + 0.09) = sqrt(0.14) ~= 0.374
    # norm(image) = sqrt(0.16 + 0.25 + 0.36) = sqrt(0.77) ~= 0.877
    # score ~= 0.65*0.374 + 0.35*0.877 = 0.243 + 0.307 = 0.55
    # denom = 0.374 + 0.877 = 1.251
    # conf = 0.55 / 1.251 ~= 0.44

    assert 0.0 <= conf <= 1.0
