import time


def profile():
    start_time = time.time()
    # Dummy profiling
    time.sleep(0.1)
    latency = time.time() - start_time
    print(f"Analysis latency: {latency:.2f}s")

if __name__ == "__main__":
    profile()
