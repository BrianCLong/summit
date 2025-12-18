# Summit Control Plane CLI (`summitctl`)

This tool provides a control plane workflow for task management and automated PR creation.

## Setup

The tool is located in `tools/summitctl`. Since the repository uses pnpm workspaces but currently has environmental issues preventing full installation, this tool is configured to be run independently.

To set it up:

```bash
cd tools/summitctl
npm install
npm run build
```

## Usage

You can run the tool from the repository root using the npm script:

```bash
npm run summitctl -- <command> [args]
```

Or directly via node:

```bash
node tools/summitctl/dist/index.js <command> [args]
```

## Commands

- `init <title>`: Initialize a new task.
- `list`: List active tasks.
- `ready <taskId>`: Mark a task as ready for PR.
- `archive <taskId>`: Archive a task (updates velocity).
- `velocity`: Show daily velocity stats.
- `pr <taskId>`: Automate PR creation.
    - Runs `npm run lint` (if present).
    - Creates/Switches to `feat/<taskId>`.
    - Commits all changes.
    - Pushes to origin.
    - Opens PR using `gh` CLI.

## Data Store

Tasks are stored in `.summit-tasks.yaml` in the repository root.
