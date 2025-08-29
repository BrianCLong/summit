# Project Board: Core Platform & Developer Experience

## To Do

- **Story:** As a developer, I want to be able to set up a new development environment in under 5 minutes so that I can start contributing to the project quickly.
  - **Task:** Review and update the `DEVELOPER_ONBOARDING.md` document to ensure it is accurate and up-to-date.
    - **Acceptance Criteria:** The `DEVELOPER_ONBOARDING.md` document is reviewed and updated with the latest setup instructions. A new developer can set up their environment by following the instructions in the document.
    - **Estimate:** 2 Story Points
  - **Task:** Create a `docker-compose.override.yml` file to allow for easier local development overrides.
    - **Acceptance Criteria:** A `docker-compose.override.yml` file is created and documented. Developers can use this file to override the default Docker Compose configuration for local development.
    - **Estimate:** 3 Story Points
  - **Task:** Investigate using a tool like `direnv` to automatically manage environment variables.
    - **Acceptance Criteria:** A recommendation is made on whether to use `direnv` or a similar tool for managing environment variables.
    - **Estimate:** 1 Story Point
- **Story:** As a developer, I want to have a clear and consistent code style so that the codebase is easy to read and maintain.
  - **Task:** Configure `eslint` and `prettier` to enforce the code style guide.
    - **Acceptance Criteria:** `eslint` and `prettier` are configured to enforce the project's code style guide. All existing code is formatted according to the new rules.
    - **Estimate:** 3 Story Points
  - **Task:** Add a pre-commit hook that runs `eslint` and `prettier` before each commit.
    - **Acceptance Criteria:** A pre-commit hook is added to the project that runs `eslint` and `prettier` on all staged files.
    - **Estimate:** 2 Story Points
  - **Task:** Document the code style guide in the `CONTRIBUTING.md` file.
    - **Acceptance Criteria:** The project's code style guide is documented in the `CONTRIBUTING.md` file.
    - **Estimate:** 1 Story Point
- **Story:** As a platform operator, I want to be able to deploy the platform to a production environment with a single command.
  - **Task:** Create a set of production-ready Docker images.
    - **Acceptance Criteria:** Production-ready Docker images are created for all services. The images are optimized for size and security.
    - **Estimate:** 5 Story Points
  - **Task:** Create a `docker-compose.prod.yml` file for production deployments.
    - **Acceptance Criteria:** A `docker-compose.prod.yml` file is created for deploying the platform to a production environment.
    - **Estimate:** 3 Story Points
  - **Task:** Write a comprehensive deployment guide that covers different deployment scenarios (e.g., bare metal, Kubernetes).
    - **Acceptance Criteria:** A comprehensive deployment guide is written that covers different deployment scenarios.
    - **Estimate:** 5 Story Points
- **Story:** As a platform operator, I want to be able to easily back up and restore the platform's data.
  - **Task:** Create scripts for backing up and restoring the Neo4j, PostgreSQL, and TimescaleDB databases.
    - **Acceptance Criteria:** Scripts are created for backing up and restoring all databases. The scripts are tested and documented.
    - **Estimate:** 5 Story Points
  - **Task:** Document the backup and restore process.
    - **Acceptance Criteria:** The backup and restore process is documented in the platform's administration guide.
    - **Estimate:** 2 Story Points
- **Story:** As a developer, I want to have a robust testing framework so that I can be confident that my changes are not breaking anything.
  - **Task:** Set up a CI/CD pipeline that runs the full test suite on every pull request.
    - **Acceptance Criteria:** A CI/CD pipeline is set up that runs the full test suite on every pull request. The pipeline is integrated with GitHub.
    - **Estimate:** 5 Story Points
  - **Task:** Add code coverage reporting to the CI/CD pipeline.
    - **Acceptance Criteria:** Code coverage reporting is added to the CI/CD pipeline. The coverage report is published to a service like Codecov.
    - **Estimate:** 2 Story Points
  - **Task:** Write a guide on how to write effective tests for the platform.
    - **Acceptance Criteria:** A guide is written on how to write effective tests for the platform. The guide includes examples of unit, integration, and end-to-end tests.
    - **Estimate:** 3 Story Points

## Blocked

## In Progress

## In Review

## Done
