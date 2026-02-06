import hashlib
import heapq


def bottom_k_sample_stream(stream, k, seed="v1"):
    """
    Performs deterministic bottom-k hash sampling over a stream of (key, degree) tuples.
    Uses O(k) memory.

    Returns:
        List of (key, degree) for the selected samples, sorted by hash.
    """
    heap = [] # Max-heap of (-hash_int, degree, key)

    for key, degree in stream:
        h = hashlib.sha256(f"{key}||{seed}".encode()).hexdigest()
        h_int = int(h, 16)

        if len(heap) < k:
            heapq.heappush(heap, (-h_int, degree, key))
        else:
            if -h_int > heap[0][0]:
                heapq.heapreplace(heap, (-h_int, degree, key))

    if not heap:
        return []

    sorted_samples = sorted(heap, key=lambda x: -x[0])
    return [(key, degree) for h, degree, key in sorted_samples]

def bottom_k_sample(node_degree_map, k, seed="v1"):
    """
    Backward compatibility wrapper.
    Returns just degrees.
    """
    sample_with_keys = bottom_k_sample_stream(node_degree_map.items(), k, seed)
    return [degree for key, degree in sample_with_keys]

def process_degree_stream(stream, sample_k, top_k=100, seed="v1"):
    """
    Processes the degree stream in a single pass to compute:
    1. Deterministic sample (bottom-k hashes)
    2. Top hubs (top-k degrees)
    3. Total degree sum and count
    """
    sample_heap = []
    top_deg_heap = []

    total_deg_sum = 0
    count = 0

    for key, degree in stream:
        count += 1
        total_deg_sum += degree

        # Sampling
        h = hashlib.sha256(f"{key}||{seed}".encode()).hexdigest()
        h_int = int(h, 16)
        if len(sample_heap) < sample_k:
            heapq.heappush(sample_heap, (-h_int, degree, key))
        elif -h_int > sample_heap[0][0]:
            heapq.heapreplace(sample_heap, (-h_int, degree, key))

        # Top hubs
        if len(top_deg_heap) < top_k:
            heapq.heappush(top_deg_heap, (degree, key))
        elif degree > top_deg_heap[0][0]:
            heapq.heapreplace(top_deg_heap, (degree, key))

    # Format results
    sample = [(key, degree) for h, degree, key in sorted(sample_heap, key=lambda x: -x[0])]
    top_hubs = sorted([(key, degree) for degree, key in top_deg_heap], key=lambda x: x[1], reverse=True)

    return sample, top_hubs, total_deg_sum, count
