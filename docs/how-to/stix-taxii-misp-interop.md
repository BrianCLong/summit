````md
# STIX/TAXII & MISP Interop — Hello World

## TAXII Pull (curl)

```bash
curl -u user:pass https://taxii.example.com/taxii2/collections
```
````

## MISP Push (PyMISP)

```python
from pymisp import ExpandedPyMISP, MISPEvent
m = ExpandedPyMISP('https://misp.local', 'API_KEY', ssl=False)
e = MISPEvent(); e.info='intelgraph demo'; e.add_attribute('domain','example.com')
m.add_event(e)
```

```

```
