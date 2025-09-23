# Feature engineering

The service exposes a `/feature/build` endpoint that currently computes
node degree features from an edge list. Example request:

```json
{
  "edges": [["a", "b"], ["b", "c"], ["c", "a"]]
}
```

The response includes each node and its degree:

```json
{
  "features": [
    {"node": "a", "degree": 2},
    {"node": "b", "degree": 2},
    {"node": "c", "degree": 2}
  ]
}
```

Additional feature builders will extend this module as the analytics
stack matures.
