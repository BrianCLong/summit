from metrics.highfreq_similarity import detail_similarity
from metrics.attention_coverage import attention_coverage
from metrics.mask_containment import mask_containment
import numpy as np
import cv2

class ReferenceFidelityPipeline:
    """
    Evaluation pipeline harness for reference fidelity.
    Uses dummy inpainting logic if no model provided.
    """

    def __init__(self, model=None):
        self.model = model

    def evaluate(self, target_img, ref_img, mask_img):
        """
        Evaluate a single (target, reference, mask) tuple using metrics.
        Returns a dictionary with metric scores.
        """
        if self.model is None:
            # Dummy generation logic for testing:
            # Replaces masked area of target with ref_img (resized to mask)
            gen_img = target_img.copy()
            # Resize ref to target
            ref_resized = cv2.resize(ref_img, (target_img.shape[1], target_img.shape[0]))

            # Simple blend using mask (assuming mask is 0..1 float array, 1=replace)
            mask_3d = mask_img if len(mask_img.shape) == 3 else np.expand_dims(mask_img, -1)
            gen_img = (target_img * (1 - mask_3d) + ref_resized * mask_3d).astype(np.uint8)

            # Dummy attention map: uniform 1s where mask is 1
            attention_map = np.ones(mask_img.shape) * mask_img
        else:
            # Real model logic
            gen_img, attention_map = self.model.generate(target_img, ref_img, mask_img)

        # Extract metrics

        # Highfreq similarity (only within mask region for fidelity)
        # Apply mask to images before calculating high freq
        mask_3d = mask_img if len(mask_img.shape) == 3 else np.expand_dims(mask_img, -1)
        ref_masked = (ref_resized * mask_3d).astype(np.uint8)
        gen_masked = (gen_img * mask_3d).astype(np.uint8)

        hf_score = detail_similarity(ref_masked, gen_masked)

        # Attention coverage
        attn_score = attention_coverage(attention_map, mask_img)

        # Mask containment
        containment_score = mask_containment(target_img, gen_img, mask_img)

        return {
            "highfreq_similarity": hf_score,
            "attention_coverage": attn_score,
            "mask_containment": containment_score,
            "fidelity_score": (hf_score + attn_score + containment_score) / 3.0
        }
