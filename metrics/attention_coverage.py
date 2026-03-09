import numpy as np


def attention_coverage(attention_map, mask):
    """
    Calculates the proportion of attention concentrated inside the mask area.
    Ensures that the reference influence alignment is strong within the masked region.
    """
    # Assuming attention_map and mask are 2D numpy arrays of the same shape
    # Values between 0 and 1

    # Flatten arrays
    att = attention_map.flatten()
    m = mask.flatten()

    total_attention = np.sum(att)
    if total_attention == 0:
        return 0.0

    attention_in_mask = np.sum(att * m)

    return float(attention_in_mask / total_attention)
