import math


def calculate_mean(data):
    if not data:
        return 0.0
    return sum(data) / len(data)

def calculate_skewness(data):
    n = len(data)
    if n < 3:
        return 0.0

    mean = calculate_mean(data)

    # Calculate 2nd and 3rd central moments
    m2 = sum((x - mean) ** 2 for x in data) / n
    m3 = sum((x - mean) ** 3 for x in data) / n

    if m2 == 0:
        return 0.0

    sigma = math.sqrt(m2)
    return m3 / (sigma ** 3)
