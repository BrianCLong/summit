# Developer Onboarding Guide

Welcome to Summit! This guide will help you get set up and contributing.

## Prerequisites

- Node.js v20+
- pnpm
- Docker & Docker Compose

## Quick Start

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/intelgraph/summit.git
    cd summit
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Start the development environment:**

    ```bash
    make up
    ```

4.  **Run the smoke test:**
    ```bash
    make smoke
    ```

## Repository Structure

- `apps/web`: The Summit UI (React/Vite).
- `server/`: The main API server (Node.js/Express).
- `packages/`: Shared libraries and domain modules.
  - `packages/attack-surface`: Asset discovery logic.
  - `packages/red-team`: Adversarial simulation.

## Contributing

1.  **Pick an issue** from the backlog.
2.  **Create a branch** using the naming convention `feat/your-feature` or `fix/your-fix`.
3.  **Write tests** for your changes.
    - Unit tests go in `__tests__` directories.
    - E2E tests go in `e2e/`.
4.  **Submit a PR**. Ensure CI passes.

## Style Guide

- Use TypeScript for all new code.
- Follow the existing ESLint and Prettier configurations.
- Document public APIs with JSDoc.
