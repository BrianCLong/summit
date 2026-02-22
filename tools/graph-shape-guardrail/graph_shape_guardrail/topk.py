def calculate_top_k_mass(data, k_percent=0.01):
    if not data:
        return 0.0

    # Sort data in descending order
    sorted_data = sorted(data, reverse=True)
    n = len(data)
    k = max(1, int(n * k_percent))

    top_k_sum = sum(sorted_data[:k])
    total_sum = sum(data)

    if total_sum == 0:
        return 0.0

    return top_k_sum / total_sum
