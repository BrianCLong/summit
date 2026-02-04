import random
import numpy as np
from scipy.stats import skew

def reservoir_sample(stream, k=50000):
    """
    Implements Reservoir Sampling (Algorithm R) to select k items from a stream.

    Args:
        stream: An iterator yielding items.
        k: The size of the reservoir.

    Returns:
        A list containing the sampled items.
    """
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randint(0, i)
            if j < k:
                reservoir[j] = item
    return reservoir

def calculate_skewness(data):
    """
    Calculates the skewness of the data.
    """
    if not data:
        return 0.0
    return float(skew(data))

def calculate_top_k_mass(data, top_percent=0.01):
    """
    Calculates the top-k mass: sum of top X% values / sum of all values.

    Args:
        data: List of numerical values.
        top_percent: The percentage of top values to consider (0.0 to 1.0).

    Returns:
        The mass ratio (0.0 to 1.0).
    """
    if not data:
        return 0.0

    sorted_data = sorted(data, reverse=True)
    n = len(sorted_data)
    if n == 0:
        return 0.0

    total_sum = sum(sorted_data)
    if total_sum == 0:
        return 0.0

    k = max(1, int(np.ceil(n * top_percent)))
    top_sum = sum(sorted_data[:k])

    return float(top_sum / total_sum)
