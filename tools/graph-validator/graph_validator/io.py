import json
from typing import Generator
from .sketch import LogBinSketch

def read_degrees(filepath: str, max_lines: int = -1) -> Generator[int, None, None]:
    """
    Reads degrees from a JSONL file.
    Expected format: {"degree": 10, ...} or just numeric 10 on each line.
    """
    count = 0
    with open(filepath, 'r') as f:
        for line in f:
            if max_lines > 0 and count >= max_lines:
                break
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
                if isinstance(data, dict):
                    yield data.get("degree", 0)
                elif isinstance(data, int):
                    yield data
            except json.JSONDecodeError:
                continue
            count += 1

def build_sketch_from_file(filepath: str, base: float = 1.1) -> LogBinSketch:
    sketch = LogBinSketch(base=base)
    for degree in read_degrees(filepath):
        sketch.add(degree)
    return sketch
