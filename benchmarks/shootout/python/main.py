import time
import json

RUNS = 5

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

def json_test():
    data = []
    for i in range(1000):
        data.append({
            "id": i,
            "name": f"Item {i}",
            "description": "Some description text that is relatively long to test string handling in JSON parsing.",
            "values": [i, i * 2, i * 3],
            "active": i % 2 == 0
        })

    json_str = json.dumps(data)
    parsed = None
    for i in range(100):
        parsed = json.loads(json_str)
    return len(parsed)

def string_concat_test():
    s = ""
    # Python string concat optimization might be smart, so we do it in a way that forces allocation usually
    # But for fair comparison to TS '+=', we use simple concat.
    for i in range(50000):
        s += str(i)
    return len(s)

def benchmark(name, func):
    total = 0
    for i in range(RUNS):
        start = time.time()
        func()
        end = time.time()
        total += (end - start) * 1000 # Convert to ms
    avg = total / RUNS
    print(f"Python, {name}, {avg:.4f}")

def main():
    # Warmup
    fib(20)
    json_test()
    string_concat_test()

    benchmark("Fibonacci(30)", lambda: fib(30))
    benchmark("JSON Parse", json_test)
    benchmark("String Concat", string_concat_test)

if __name__ == "__main__":
    main()
