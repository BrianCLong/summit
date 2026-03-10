import numpy as np

def mask_containment(target, gen, mask):
    """
    Ensures that modifications are contained within the masked region.
    Computes similarity between the generated image and target image OUTSIDE the mask.
    Returns 1.0 if perfectly contained (no changes outside mask), lower otherwise.
    """
    # Assuming images are 3D (H,W,C) and mask is 2D (H,W) or 3D (H,W,1)
    # Mask values: 1 for area to change, 0 for area to keep

    if len(mask.shape) == 2:
        # Expand mask to match channels if needed
        mask = np.expand_dims(mask, axis=-1)

    # Calculate inverted mask (area that should not change)
    inv_mask = 1.0 - mask

    # Calculate absolute difference only in the area that should not change
    diff = np.abs(target.astype(np.float32) - gen.astype(np.float32))
    masked_diff = diff * inv_mask

    # Normalize diff by max pixel value (255)
    normalized_diff = masked_diff / 255.0

    # Calculate mean error over the area outside the mask
    area_outside_mask = np.sum(inv_mask) * (target.shape[-1] if len(target.shape) == 3 else 1)

    if area_outside_mask == 0:
        return 1.0  # Entire image was allowed to change

    mean_error = np.sum(normalized_diff) / area_outside_mask

    # Return containment score (1.0 = perfect containment, 0.0 = completely changed outside mask)
    return float(max(0.0, 1.0 - mean_error))
