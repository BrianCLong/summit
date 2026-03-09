import cv2
import numpy as np


def highfreq_map(img):
    """
    Computes a high-frequency feature map of an image using the Laplacian operator.
    Useful for capturing texture and fine-grained details.
    """
    # Laplacian typically works best on grayscale or per-channel
    if len(img.shape) == 3 and img.shape[2] == 3:
        # Convert to grayscale for Laplacian
        if img.dtype != np.uint8 and img.dtype != np.float32:
             img = img.astype(np.float32)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    return cv2.Laplacian(img, cv2.CV_64F)

def detail_similarity(ref, gen):
    """
    Computes cosine similarity between the high-frequency maps of two images.
    Used as a proxy for DAL (Detail-Aware Loss) from HiFi-Inpaint.
    """
    r = highfreq_map(ref).flatten()
    g = highfreq_map(gen).flatten()

    # Avoid division by zero
    norm_r = np.linalg.norm(r)
    norm_g = np.linalg.norm(g)

    if norm_r == 0 or norm_g == 0:
        return 1.0 if np.allclose(r, g) else 0.0

    return float(np.dot(r, g) / (norm_r * norm_g + 1e-8))
