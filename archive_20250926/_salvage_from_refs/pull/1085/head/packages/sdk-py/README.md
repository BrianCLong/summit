# maestro-sdk (Python)

Install (local):
```bash
pip install -e .
```

Usage:

```python
from maestro_sdk.task import define_task
from maestro_sdk.types import RunContext

adder = define_task({
    'execute': lambda ctx, input: { 'result': input['a'] + input['b'] }
})

ctx = RunContext()
print(adder.execute(ctx, { 'a': 1, 'b': 2 }))
```
