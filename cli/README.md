# Summit CLI

The Summit CLI streamlines local development by wrapping the most common Docker, Kubernetes, and workspace commands behind a single entrypoint.

## Installation

From the repository root install dependencies and link the CLI globally:

```bash
npm run cli:install
npm run cli:link
```

Once linked, the `summit` command is available on your PATH.

Alternatively, you can run the CLI without linking:

```bash
node cli/bin/summit.js <command>
```

## Commands

### `summit up`

Start the local stack.

| Option | Description |
| --- | --- |
| `--compose-file <path>` | Compose file to use (default: `docker-compose.yml`). |
| `--services <names>` | Comma separated services to start (defaults to all). |
| `--no-detach` | Keep Docker containers in the foreground. |
| `--build` | Force a build before starting containers. |
| `--k8s` | Apply Kubernetes manifests instead of Docker Compose. |
| `--kube-manifest <path>` | File or directory of Kubernetes manifests (default: `deploy/k8s`). |
| `--namespace <name>` | Kubernetes namespace (default: `summit-dev`). |
| `--context <name>` | Kubernetes context to use with kubectl. |

Examples:

```bash
summit up
summit up --compose-file ops/docker-compose.yml --services api,worker
summit up --k8s --kube-manifest infra/k8s --namespace summit-dev
```

### `summit test`

Run repo tests with your preferred package manager.

| Option | Description |
| --- | --- |
| `--scope <name>` | `all`, `server`, or `client` (defaults to `all`). |
| `--package-manager <pm>` | Override package manager detection (`pnpm`, `npm`, `yarn`). |
| `--watch` | Append `--watch` to the test command. |
| `--` | Pass additional flags directly to the underlying test runner. |

Examples:

```bash
summit test
summit test --scope server
summit test -- --runInBand
```

### `summit seed`

Seed databases using the existing workspace scripts.

| Option | Description |
| --- | --- |
| `--package-manager <pm>` | Override package manager detection. |
| `--dry-run` | Print the seed command without executing it. |

Examples:

```bash
summit seed
summit seed --dry-run
```

## Package manager detection

The CLI inspects lockfiles in the repository root (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`) to determine which package manager to use. You can always override this with the `--package-manager` option.

## Troubleshooting

- Ensure Docker or Kubernetes CLIs are installed locally.
- For Kubernetes workflows set the correct context with `--context`.
- When running without `npm run cli:link`, use `node cli/bin/summit.js` to avoid PATH issues.
