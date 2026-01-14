# Empty State Audit (apps/web)

This inventory lists every `EmptyState` usage in `apps/web`, along with the
primary CTA and secondary quick actions (when present).

| Route / Area                | Empty state title                         | Primary CTA (route/action)            | Quick actions (route/action)                                                                        |
| --------------------------- | ----------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/` HomePage (KPI strip)    | No live metrics                           | Connect data source (`/data/sources`) | Review alerts (`/alerts`), Start investigation (`/explore`)                                         |
| `/alerts` (error)           | Failed to load alerts                     | Retry (reload page)                   | None                                                                                                |
| `/alerts` (no results)      | No alerts found                           | Clear filters (reset filters)         | Review cases (`/cases`), Explore investigations (`/explore`), Connect data source (`/data/sources`) |
| `/alerts/:id`               | Alert detail page under construction      | None                                  | None                                                                                                |
| `/cases`                    | No cases found                            | Create a case (`/cases/new`)          | Review alerts (`/alerts`), Explore investigations (`/explore`)                                      |
| `/cases/:id` (no live data) | Case data unavailable                     | Go back (`/cases`)                    | None                                                                                                |
| `/cases/:id` (loading)      | Loading case data                         | None                                  | None                                                                                                |
| `/reports`                  | No reports found                          | None                                  | None                                                                                                |
| `/models`                   | Models page under construction            | None                                  | None                                                                                                |
| `/admin/*`                  | Admin page under construction             | None                                  | None                                                                                                |
| `/explore` (error)          | Failed to load graph data                 | Retry (reload page)                   | None                                                                                                |
| `/explore` (no entities)    | No entities found                         | Clear filters (reset filters)         | None                                                                                                |
| `/dashboards/supply-chain`  | Supply Chain dashboard under construction | None                                  | None                                                                                                |
| `/dashboards/usage-cost`    | No usage data available                   | None                                  | None                                                                                                |
| `/access-denied`            | Access Denied                             | Go Home (`/`)                         | None                                                                                                |
| `/help`                     | Help page under construction              | None                                  | None                                                                                                |
| `/changelog`                | Changelog page under construction         | None                                  | None                                                                                                |
| `/maestro` (runs timeline)  | No live run data                          | None                                  | None                                                                                                |
| `/maestro` (cost tracking)  | No live cost data                         | None                                  | None                                                                                                |
| `/maestro` (activity feed)  | No live activity                          | None                                  | None                                                                                                |
| `/maestro/runs`             | No live runs                              | None                                  | None                                                                                                |
