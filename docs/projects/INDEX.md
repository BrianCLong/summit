# GitHub Projects Documentation

This directory contains the documentation, working agreements, and setup guides for our GitHub Projects.

## Project Links

*   [Team Planning — Q4 2025](https://github.com/users/brianlong/projects/1)
*   [Kanban — Platform](https://github.com/users/brianlong/projects/2)
*   [Feature Release — Cross-Platform Sync](https://github.com/users/brianlong/projects/3)
*   [Bug Tracker — All Products](https://github.com/users/brianlong/projects/4)
*   [Iterations — Core Platform](https://github.com/users/brianlong/projects/5)
*   [Launch — Summit v2.0](https://github.com/users/brianlong/projects/6)
*   [Roadmap — FY2025](https://github.com/users/brianlong/projects/7)
*   [Retro — Sprint 1](https://github.com/users/brianlong/projects/8)

## How to Maintain

The projects are managed via configuration files and scripts in this repository.

*   **Schemas**: `projects/seed/*.json`
*   **Scripts**: `scripts/projects/*.sh`
*   **Automation**: `.github/workflows/project-sync.yml`

To make changes, modify the relevant seed file and re-run the `make projects-seed` command.
