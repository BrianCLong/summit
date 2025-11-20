# @summit/djce-pb

TypeScript bindings for the [`djce-pb`](../../djce-pb) Rust library. The bindings
are generated with [`napi-rs`](https://napi.rs/) and expose the `assessJoin`
API for pre-join risk evaluation and guardrail recommendations.

## Usage

```ts
import { assessJoin } from '@summit/djce-pb';

const left = {
  name: 'marketing',
  records: [
    ['alice', '1985', 'denver'],
    ['bob', '1976', 'denver']
  ]
};

const right = {
  name: 'crm',
  records: [
    ['alice', '1985', 'denver'],
    ['dave', '1990', 'boston']
  ]
};

const report = assessJoin(left, right);
console.log(report.risk_bounds.classification);
```

To build the native module run:

```bash
npm install
npm run build
```

This invokes `napi build` which compiles the Rust crate with the `node`
feature enabled. The resulting `index.node` artifact is placed in the
`native/` directory and consumed by the TypeScript wrapper.
