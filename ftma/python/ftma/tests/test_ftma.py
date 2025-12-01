import math
import random

import numpy as np
import pytest

from ftma import Coordinator


def centralized_statistics(vectors):
    arr = np.array(vectors, dtype=float)
    sums = arr.sum(axis=0)
    means = sums / arr.shape[0]
    variances = arr.var(axis=0)
    return sums.tolist(), means.tolist(), variances.tolist()


def quantize_vectors(vectors, scale):
    return [[round(value * scale) / scale for value in vec] for vec in vectors]


def test_secure_aggregation_matches_centralized():
    random.seed(42)
    num_clients = 8
    threshold = 5
    dimension = 3
    coordinator = Coordinator(num_clients, threshold, dimension, scale=1_000_000)

    updates = []
    for client_id in range(num_clients):
        metrics = [random.uniform(-10.0, 10.0) for _ in range(dimension)]
        updates.append(metrics)
        masked = coordinator.register_client(client_id, metrics)
        assert len(masked) == dimension * 2

    active_clients = [0, 1, 2, 4, 5, 6]
    quantized = quantize_vectors(updates, coordinator.scale)
    expected_sum, expected_mean, expected_var = centralized_statistics(quantized)

    result = coordinator.finalize(active_clients)

    assert result.participants == num_clients
    assert result.survivors == len(active_clients)
    for idx in range(dimension):
        assert math.isclose(result.sum[idx], expected_sum[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.mean[idx], expected_mean[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.variance[idx], expected_var[idx], rel_tol=1e-6, abs_tol=1e-6)


def test_dropout_resilience_multiple_clients():
    num_clients = 10
    threshold = 6
    dimension = 2
    coordinator = Coordinator(num_clients, threshold, dimension, scale=1_000)

    updates = []
    rng = random.Random(1337)
    for client_id in range(num_clients):
        metrics = [rng.randint(-50, 50) for _ in range(dimension)]
        updates.append(metrics)
        coordinator.register_client(client_id, metrics)

    active_clients = [0, 1, 3, 4, 6, 7, 9]
    quantized = quantize_vectors(updates, coordinator.scale)
    expected_sum, expected_mean, expected_var = centralized_statistics(quantized)

    result = coordinator.finalize(active_clients)

    assert result.participants == num_clients
    assert result.survivors == len(active_clients)
    for idx in range(dimension):
        assert math.isclose(result.sum[idx], expected_sum[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.mean[idx], expected_mean[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.variance[idx], expected_var[idx], rel_tol=1e-6, abs_tol=1e-6)


def test_threshold_enforced():
    num_clients = 5
    threshold = 4
    dimension = 1
    coordinator = Coordinator(num_clients, threshold, dimension)

    for client_id in range(num_clients):
        coordinator.register_client(client_id, [float(client_id + 1)])

    with pytest.raises(RuntimeError):
        coordinator.finalize([0, 1])


def test_handles_unregistered_clients():
    num_clients = 6
    threshold = 4
    dimension = 2
    coordinator = Coordinator(num_clients, threshold, dimension, scale=1_000)

    updates = []
    rng = random.Random(2024)
    for client_id in range(4):
        metrics = [rng.uniform(-3.0, 3.0) for _ in range(dimension)]
        updates.append(metrics)
        coordinator.register_client(client_id, metrics)

    quantized = quantize_vectors(updates, coordinator.scale)
    expected_sum, expected_mean, expected_var = centralized_statistics(quantized)

    result = coordinator.finalize([0, 1, 2, 3])

    assert result.participants == 4
    assert result.survivors == 4
    for idx in range(dimension):
        assert math.isclose(result.sum[idx], expected_sum[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.mean[idx], expected_mean[idx], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(result.variance[idx], expected_var[idx], rel_tol=1e-6, abs_tol=1e-6)
