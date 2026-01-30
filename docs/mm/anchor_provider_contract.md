# Anchor Caption Provider Contract

## Interface
Providers must implement the `CaptionProvider` protocol:

```python
class CaptionProvider(Protocol):
    def caption(self, image_bytes: bytes) -> AnchorCaption: ...
```

## Requirements
1. **Determinism**: Same image -> same caption (for temperature=0).
2. **Confidence**: Must return a confidence score.
3. **Safety**: Must not output PII or harmful content.

## Testing
- Mocks should be used for unit tests.
- Real providers should be tested with "standard" images to verify semantic stability.
