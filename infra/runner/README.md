# GitHub Self-Hosted Runner Setup

## Prerequisites

- Docker and Docker Compose installed
- GitHub PAT or Runner Token

## Setup Steps

1. Copy .env.example to .env
2. Generate token at: https://github.com/BrianCLong/summit/settings/actions/runners
3. Update RUNNER_TOKEN in .env
4. Run: docker-compose up -d
5. Verify in Actions > Runners

## Cleanup

docker-compose down
