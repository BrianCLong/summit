# Streaming Microexpression Analysis

IntelGraph now includes a lightweight scaffold for real-time microexpression detection.
The analyzer processes a stream of video frames and yields classified facial microexpressions
with confidence scores. It is designed for experimentation and can be extended with
production-grade models.

## Module

- `server/ml/models/microexpression_stream.py` – generator-based analyzer that emits
  `MicroexpressionResult` objects for each frame.

## Usage

```python
from server.ml.models.microexpression_stream import create_analyzer

frames = ((ts, frame) for ts, frame in video_stream)
analyzer = create_analyzer()
for result in analyzer.analyze_stream(frames):
  print(result)
```

The current implementation uses random classifications; plug in a real model
for deployment scenarios.
