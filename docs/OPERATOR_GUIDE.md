# Operator Guide

This document provides runbooks for common operational tasks.

## Deployment

The application is deployed using Docker Compose.

**To start the application:**

```bash
make up
```

**To stop the application:**

```bash
make down
```

**To restart the application:**

```bash
make restart
```

## Development

**To run the development server:**

```bash
make dev
```

**To run tests:**

```bash
make test
```

**To run the linter:**

```bash
make lint
```

**To format the code:**

```bash
make format
```

## Data Management

**To run database migrations:**

```bash
make db-migrate
```

**To seed the database:**

```bash
make db-seed
```

## Backup and Restore

_(Coming soon)_

## Disaster Recovery

_(Coming soon)_

## Scaling

_(Coming soon)_
