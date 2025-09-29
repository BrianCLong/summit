# Sprint Kit: Proof-First Core GA

This kit packages all artifacts required to run the two-week "Proof-First Core GA" sprint. Copy the contents into an empty repository or merge selected files into an existing workspace to bootstrap planning, execution, and demo workflows.

## Contents

| Section | Artifact                        | Location                                                                 |
| ------- | ------------------------------- | ------------------------------------------------------------------------ |
| 0       | Sprint overview                 | `docs/overview/sprint-overview.md`                                       |
| 1       | Epics, user stories, acceptance | `docs/overview/epics-user-stories.md`                                    |
| 2       | Sprint backlog (issues)         | `docs/overview/sprint-backlog.md`, `seed/issues.csv`, `seed/issues.yaml` |
| 3       | Team setup & cadence            | `docs/overview/team-setup.md`                                            |
| 4       | Definition of Ready             | `docs/overview/definitions.md`                                           |
| 5       | Definition of Done              | `docs/overview/definitions.md`                                           |
| 6       | CI/CD gates                     | `ci/ci.yml`                                                              |
| 7       | Issue & PR templates            | `templates/github/`                                                      |
| 8       | Branching, commits, labels      | `docs/overview/conventions.md`                                           |
| 9       | Test plans                      | `docs/overview/test-plans.md`                                            |
| 10      | Observability & dashboards      | `docs/overview/observability.md`                                         |
| 11      | Security & policy               | `docs/overview/security.md`                                              |
| 12      | Demo script                     | `docs/overview/demo-script.md`                                           |
| 13      | Runbooks                        | `docs/runbooks/incident-checklist.md`                                    |
| 14      | Folder structure                | `docs/overview/folder-structure.md`                                      |
| 15      | RACI                            | `docs/overview/raci.md`                                                  |
| 16      | Issue seeder                    | `seed/seed-issues.sh`                                                    |
| 17      | CODEOWNERS                      | `templates/github/CODEOWNERS`                                            |
| 18      | Labels seed                     | `labels/labels.yaml`                                                     |
| 19      | GitHub project automation       | `docs/overview/project-automation.md`                                    |
| 20      | Milestones & capacity           | `docs/overview/capacity.md`                                              |
| 21      | Risk register                   | `docs/overview/risk-register.md`                                         |
| 22      | Prometheus rules                | `prometheus/rules.yaml`                                                  |
| 23      | Makefile targets                | `make/Makefile`                                                          |
| 24      | Contributing expectations       | `docs/overview/contributing.md`                                          |
| 25      | Quickstart commands             | `docs/overview/quickstart.md`                                            |
| 26      | API contracts                   | `api/services/*/openapi.yaml`                                            |
| 27      | GraphQL schema                  | `api/graphql/schema.graphql`                                             |
| 28      | Helm charts                     | `charts/*`                                                               |
| 29      | Docker Compose stack            | `devstack/docker-compose.yml`                                            |
| 30      | Test scaffolds                  | `tests/cypress/time_to_path.cy.ts`, `tests/k6/smoke.js`                  |
| 31      | Fixtures                        | `fixtures/**`                                                            |
| 32      | prov-verify CLI skeleton        | `scripts/prov-verify/main.go`                                            |
| 33      | OPA policy starter              | `policy/export.rego`                                                     |
| 34      | Threat model checklist          | `docs/overview/threat-model.md`                                          |
| 35      | Demo data generator             | `scripts/seed-graph.js`                                                  |
| 36      | Repo README stub                | `docs/overview/readme-stub.md`                                           |
| 37      | ADR template & sample           | `docs/adr/0000-template.md`, `docs/adr/0001-runtime-langs.md`            |

## Usage

1. Copy the folders in this kit into your repository root.
2. Update organization-specific metadata (owner handles, project IDs, secrets).
3. Run the seeding scripts (labels, issues, board) using the provided quickstart commands.
4. Follow the runbooks and demo script during the sprint review.

Each artifact is self-contained and references the sprint goal, success metrics, and scope boundaries defined for Proof-First Core GA.
