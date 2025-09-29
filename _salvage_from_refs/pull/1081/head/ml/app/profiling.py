"""Utility functions for profiling inference latency and memory usage."""

import time
from collections.abc import Callable
from typing import Any

import psutil


def profile_function(fn: Callable[[], Any]) -> tuple[Any, float, int]:
    """Run ``fn`` and measure its latency and memory delta.

    Returns a tuple of (result, latency_seconds, memory_bytes).
    """
    process = psutil.Process()
    start_mem = process.memory_info().rss
    start = time.perf_counter()
    result = fn()
    latency = time.perf_counter() - start
    end_mem = process.memory_info().rss
    mem_delta = end_mem - start_mem
    return result, latency, mem_delta
