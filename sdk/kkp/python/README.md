# KKP Python Client

The Python package exposes minimal helpers for interacting with the Keyless KMS Proxy and
verifying tokens offline.

```python
from kkp_client import KkpClient, verify_token

client = KkpClient('https://kkp.internal')
token = client.issue_token({
    'subject': 'svc',
    'audience': 'app',
    'backend': 'aws',
    'key_id': 'alias/app',
})

jwks = client.fetch_jwks()
claims = verify_token(token['token'], jwks)
```

Install and build locally:

```bash
cd sdk/kkp/python
pip install -e .
```
