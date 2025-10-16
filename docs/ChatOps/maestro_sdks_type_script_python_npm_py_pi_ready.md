# Maestro SDKs — TypeScript & Python (NPM/PyPI Ready)

**Last Updated:** 2025‑08‑31 • **Owner:** Platform PM/Eng • **Scope:** Ready‑to‑publish SDK skeletons for Maestro tasks, connectors, policy calls, provenance, and runtime helpers.

---

## 0) Monorepo Layout (drop under the Maestro repo root)

```
packages/
  sdk-ts/
    package.json
    tsconfig.json
    src/
      index.ts
      types.ts
      context.ts
      task.ts
      connector.ts
      policy.ts
      provenance.ts
    examples/
      tasks/http-get.ts
      connectors/sig-ingest.ts
    test/
      task.spec.ts
  sdk-py/
    pyproject.toml
    README.md
    src/maestro_sdk/
      __init__.py
      types.py
      context.py
      task.py
      connector.py
      policy.py
      provenance.py
    examples/
      http_get.py
    tests/
      test_task.py
```

---

## 1) TypeScript SDK (packages/sdk-ts)

### 1.1 `package.json`

```json
{
  "name": "@summit/maestro-sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for Summit Maestro tasks, connectors, and policy-aware execution",
  "repository": "https://github.com/your-org/maestro",
  "license": "UNLICENSED",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "clean": "rimraf dist",
    "lint": "eslint .",
    "test": "vitest run",
    "prepublishOnly": "npm run clean && npm run build && npm test"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "eslint": "^9.5.0",
    "rimraf": "^5.0.5",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

### 1.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### 1.3 `src/types.ts`

```ts
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export interface PolicyContext {
  purpose: string;
  authority: string;
  license: string;
}

export interface RunContext {
  runId: string;
  workflowRef: string;
  namespace: string;
  correlation?: Record<string, string>;
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
  secrets: (key: string) => Promise<string>;
  emit: (event: string, payload: Json) => Promise<void>;
  policy?: PolicyContext;
}

export interface TaskInput<T = Json> {
  payload: T;
}
export interface TaskOutput<T = Json> {
  payload: T;
}
```

### 1.4 `src/context.ts`

```ts
import type { RunContext } from './types.js';

export function createRunContext(partial: Partial<RunContext>): RunContext {
  return {
    runId: partial.runId ?? 'local',
    workflowRef: partial.workflowRef ?? 'local',
    namespace: partial.namespace ?? 'dev',
    correlation: partial.correlation ?? {},
    logger: partial.logger ?? { info: console.log, error: console.error },
    secrets: partial.secrets ?? (async () => ''),
    emit: partial.emit ?? (async () => {}),
    policy: partial.policy,
  };
}
```

### 1.5 `src/task.ts`

```ts
import type { RunContext, TaskInput, TaskOutput } from './types.js';

export interface Task<TIn = unknown, TOut = unknown> {
  init?: (ctx: RunContext) => Promise<void> | void;
  validate?: (input: TaskInput<TIn>) => Promise<void> | void;
  execute: (
    ctx: RunContext,
    input: TaskInput<TIn>,
  ) => Promise<TaskOutput<TOut>>;
}

export function defineTask<TIn = unknown, TOut = unknown>(
  task: Task<TIn, TOut>,
): Task<TIn, TOut> {
  return task;
}
```

### 1.6 `src/connector.ts`

```ts
import type { RunContext } from './types.js';

export interface ConnectorConfig {
  [k: string]: unknown;
}

export interface Connector<TIn = unknown, TOut = unknown> {
  init?: (ctx: RunContext) => Promise<void> | void;
  send: (ctx: RunContext, input: TIn, cfg?: ConnectorConfig) => Promise<TOut>;
}

export function defineConnector<TIn = unknown, TOut = unknown>(
  c: Connector<TIn, TOut>,
): Connector<TIn, TOut> {
  return c;
}
```

### 1.7 `src/policy.ts`

```ts
import type { PolicyContext } from './types.js';

export interface PolicyDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

export class PolicyClient {
  constructor(
    private baseUrl: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const res = await this.fetchImpl(`${this.baseUrl}/policy/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx),
    });
    if (!res.ok) throw new Error(`PDP error ${res.status}`);
    return res.json() as Promise<PolicyDecision>;
  }
}
```

### 1.8 `src/provenance.ts`

```ts
export interface ProvenanceReceipt {
  runId: string;
  inputsHash: string;
  codeDigest: string;
  outputsHash: string;
  signer?: string;
}
```

### 1.9 `src/index.ts`

```ts
export * from './types.js';
export * from './context.js';
export * from './task.js';
export * from './connector.js';
export * from './policy.js';
export * from './provenance.js';
```

### 1.10 Example Task — `examples/tasks/http-get.ts`

```ts
import {
  defineTask,
  createRunContext,
  type TaskInput,
} from '@summit/maestro-sdk';

export default defineTask<{ url: string }, { status: number; body: string }>({
  async validate(input: TaskInput<{ url: string }>) {
    if (!input.payload?.url) throw new Error('url is required');
  },
  async execute(ctx, input) {
    const res = await fetch(input.payload.url);
    const body = await res.text();
    ctx.logger.info('http-get', { status: res.status, bytes: body.length });
    await ctx.emit('http_get.done', { status: res.status });
    return { payload: { status: res.status, body } };
  },
});

// Local demo
if (process.env.NODE_ENV === 'development') {
  const ctx = createRunContext({});
  const task = (await import('./http-get.ts')).default;
  task
    .execute(ctx, { payload: { url: 'https://example.com' } })
    .then((r) => console.log(r));
}
```

### 1.11 Example Connector — `examples/connectors/sig-ingest.ts`

```ts
import { defineConnector, type RunContext } from '@summit/maestro-sdk';

type Item = { id: string; payload: unknown };

export default defineConnector<
  Item[],
  { jobId: string; receipts: Array<{ id: string; hash: string }> }
>({
  async send(ctx: RunContext, items: Item[]) {
    const endpoint = await ctx.secrets('SIG_INGEST_URL');
    const res = await fetch(`${endpoint}/ingest/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(`SIG ingest failed ${res.status}`);
    return res.json();
  },
});
```

### 1.12 Vitest — `test/task.spec.ts`

```ts
import { defineTask, createRunContext } from '../src/index.js';

test('task validates and executes', async () => {
  const t = defineTask<{ n: number }, { doubled: number }>({
    validate: ({ payload }) => {
      if (payload.n == null) throw new Error('n required');
    },
    execute: async (_ctx, { payload }) => ({
      payload: { doubled: payload.n * 2 },
    }),
  });
  const ctx = createRunContext({});
  const out = await t.execute(ctx, { payload: { n: 2 } });
  expect(out.payload.doubled).toBe(4);
});
```

---

## 2) Python SDK (packages/sdk-py)

### 2.1 `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "maestro-sdk"
version = "0.1.0"
description = "Python SDK for Summit Maestro tasks, connectors, and policy-aware execution"
authors = [{name = "Summit", email = "dev@your-org.example"}]
license = {text = "UNLICENSED"}
readme = "README.md"
requires-python = ">=3.9"
dependencies = ["requests>=2.31.0"]

[project.urls]
Homepage = "https://github.com/your-org/maestro"

[tool.setuptools]
package-dir = {"" = "src"}

[tool.pytest.ini_options]
addopts = "-q"
```

### 2.2 `src/maestro_sdk/types.py`

```python
from typing import Any, Dict, Optional, TypedDict

Json = Any

class PolicyContext(TypedDict):
    purpose: str
    authority: str
    license: str

class RunContext:
    def __init__(self,
                 run_id: str = "local",
                 workflow_ref: str = "local",
                 namespace: str = "dev",
                 correlation: Optional[Dict[str, str]] = None,
                 logger: Optional[Any] = None,
                 secrets=None,
                 emit=None,
                 policy: Optional[PolicyContext] = None):
        self.run_id = run_id
        self.workflow_ref = workflow_ref
        self.namespace = namespace
        self.correlation = correlation or {}
        self.logger = logger or type("L", (), {"info": print, "error": print})()
        self.secrets = secrets or (lambda key: "")
        self.emit = emit or (lambda evt, payload: None)
        self.policy = policy
```

### 2.3 `src/maestro_sdk/task.py`

```python
from typing import Protocol, Generic, TypeVar
from .types import RunContext, Json

TIn = TypeVar('TIn')
TOut = TypeVar('TOut')

class Task(Protocol, Generic[TIn, TOut]):
    def init(self, ctx: RunContext) -> None: ...  # optional
    def validate(self, input: Json) -> None: ...  # optional
    def execute(self, ctx: RunContext, input: Json) -> Json: ...

def define_task(task: Task[TIn, TOut]) -> Task[TIn, TOut]:
    return task
```

### 2.4 `src/maestro_sdk/connector.py`

```python
from typing import Protocol, Generic, TypeVar, Any, Dict
from .types import RunContext

TIn = TypeVar('TIn')
TOut = TypeVar('TOut')

class Connector(Protocol, Generic[TIn, TOut]):
    def init(self, ctx: RunContext) -> None: ...  # optional
    def send(self, ctx: RunContext, input: TIn, cfg: Dict[str, Any] | None = None) -> TOut: ...

def define_connector(c: Connector[TIn, TOut]) -> Connector[TIn, TOut]:
    return c
```

### 2.5 `src/maestro_sdk/policy.py`

```python
import requests
from .types import PolicyContext

class PolicyClient:
    def __init__(self, base_url: str, session: requests.Session | None = None):
        self.base_url = base_url
        self.session = session or requests.Session()

    def evaluate(self, ctx: PolicyContext) -> dict:
        r = self.session.post(f"{self.base_url}/policy/evaluate", json=ctx, timeout=10)
        r.raise_for_status()
        return r.json()
```

### 2.6 `src/maestro_sdk/provenance.py`

```python
from dataclasses import dataclass

@dataclass
class ProvenanceReceipt:
    run_id: str
    inputs_hash: str
    code_digest: str
    outputs_hash: str
    signer: str | None = None
```

### 2.7 `README.md`

````md
# maestro-sdk (Python)

Install (local):

```bash
pip install -e .
```
````

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

````

### 2.8 Example — `examples/http_get.py`
```python
import requests
from maestro_sdk.task import define_task
from maestro_sdk.types import RunContext

http_get = define_task({
    'validate': lambda input: (_ for _ in ()).throw(Exception('url required')) if not input.get('url') else None,
    'execute': lambda ctx, input: {
        'status': requests.get(input['url']).status_code
    }
})

if __name__ == '__main__':
    ctx = RunContext()
    print(http_get.execute(ctx, { 'url': 'https://example.com' }))
````

### 2.9 Tests — `tests/test_task.py`

```python
from maestro_sdk.task import define_task
from maestro_sdk.types import RunContext

def test_execute():
    t = define_task({
        'execute': lambda ctx, input: { 'x2': input['n'] * 2 }
    })
    ctx = RunContext()
    out = t.execute(ctx, { 'n': 3 })
    assert out['x2'] == 6
```

---

## 3) Publish Workflows

### 3.1 NPM Publish (SDK‑TS) — `.github/workflows/publish-npm.yml`

```yaml
name: Publish NPM (SDK‑TS)

on:
  push:
    tags:
      - 'sdk-ts-v*.*.*'

jobs:
  build-publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/sdk-ts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 3.2 PyPI Publish (SDK‑PY) — `.github/workflows/publish-pypi.yml`

```yaml
name: Publish PyPI (SDK‑PY)

on:
  push:
    tags:
      - 'sdk-py-v*.*.*'

jobs:
  build-publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/sdk-py
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: python -m pip install --upgrade build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_API_TOKEN }}
```

---

## 4) Usage Snippets

### 4.1 Using TS task in a workflow step

```ts
import { defineTask } from '@summit/maestro-sdk';

export default defineTask<{ path: string }, { ok: boolean }>({
  async execute(ctx, { payload }) {
    ctx.logger.info('processing', { path: payload.path });
    return { payload: { ok: true } };
  },
});
```

### 4.2 Python connector sending to SIG

```python
import requests
from maestro_sdk.connector import define_connector
from maestro_sdk.types import RunContext

sig_ingest = define_connector({
  'send': lambda ctx, items, cfg=None: requests.post(
      f"{cfg['endpoint']}/ingest/batch", json={'items': items}, timeout=10).json()
})

ctx = RunContext()
print(sig_ingest.send(ctx, [{ 'id': 'i-1', 'payload': {} }], { 'endpoint': 'https://sig.internal' }))
```

---

## 5) Versioning & Conventions

- **SemVer**; tag TS releases `sdk-ts-vX.Y.Z`, Python `sdk-py-vX.Y.Z`.
- `defineTask`/`defineConnector` wrap simple dict/obj so authors can write minimal code.
- Do **not** embed SIG ontology; provide adapters in `examples/` that call SIG APIs.
- Enforce policy via `PolicyClient` **before** sensitive operations.

---

## 6) Next Steps

1. Add lint configs (ESLint, Ruff) if desired.
2. Expand examples: approval gate task, schema‑validate task, SIG export packager.
3. Publish alpha packages with `NPM_TOKEN` and `PYPI_API_TOKEN` secrets.
