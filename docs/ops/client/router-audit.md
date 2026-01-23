# Client Router Audit

This document audits the route and component imports in `client/src/App.router.jsx` to ensure correctness and identify potential issues.

Two missing component imports were discovered during this audit and have been replaced with minimal stub pages.

| Route Path               | Component Import Path                           | File Exists (Y/N) | Export Type | Notes                                                  |
| :----------------------- | :---------------------------------------------- | :---------------- | :---------- | :----------------------------------------------------- |
| `/login`                 | `./components/auth/LoginPage.jsx`               | Y                 | default     | Static import                                          |
| `/dashboard`             | (inline)                                        | Y                 | n/a         | Component defined in `App.router.jsx`                  |
| `/search`                | `./pages/Search/SearchHome`                     | Y                 | default     | Lazy loaded. Stub page from #16620.                    |
| `/search/results/:id`    | `./pages/Search/SearchResultDetail`             | Y                 | default     | Lazy loaded. Stub page created to fix missing import.  |
| `/hunts`                 | `./pages/Hunting/HuntList`                      | Y                 | default     | Lazy loaded. Stub page from #16620.                    |
| `/hunts/:id`             | `./pages/Hunting/HuntDetail`                    | Y                 | default     | Lazy loaded. Stub page created to fix missing import.  |
| `/ioc`                   | `./pages/IOC/IOCList`                           | Y                 | default     | Lazy loaded. Stub page from #16620.                    |
| `/ioc/:id`               | `./pages/IOC/IOCDetail`                         | Y                 | default     | Lazy loaded. Stub page from #16620.                    |
| `/investigations`        | `./components/timeline/InvestigationTimeline`   | Y                 | default     | Lazy loaded, rendered via `InvestigationsPage` wrapper |
| `/graph`                 | `./components/graph/InteractiveGraphExplorer`   | Y                 | default     | Lazy loaded, rendered via `GraphExplorerPage` wrapper  |
| `/copilot`               | `./components/ai/IntelligentCopilot`            | Y                 | default     | Lazy loaded, rendered via `CopilotPage` wrapper        |
| `/orchestrator`          | `./features/orchestrator/OrchestratorDashboard` | Y                 | default     | Lazy loaded, rendered via `OrchestratorPage` wrapper   |
| `/threats`               | `./components/threat/ThreatAssessmentEngine`    | Y                 | default     | Lazy loaded, rendered via `ThreatsPage` wrapper        |
| `/disclosures`           | `./pages/DisclosurePackagerPage`                | Y                 | default     | Lazy loaded                                            |
| `/access-intel`          | `./features/rbac/AccessIntelPage.jsx`           | Y                 | default     | Lazy loaded                                            |
| `/geoint`                | `./components/timeline/InvestigationTimeline`   | Y                 | default     | Re-uses `InvestigationsPage` wrapper                   |
| `/reports`               | `./components/timeline/InvestigationTimeline`   | Y                 | default     | Re-uses `InvestigationsPage` wrapper                   |
| `/demo`                  | `./pages/DemoWalkthrough`                       | Y                 | default     | Lazy loaded                                            |
| `/partner-console`       | `./pages/partner-console/PartnerConsolePage`    | Y                 | default     | Lazy loaded                                            |
| `/approvals`             | `./switchboard/approvals/ApprovalsExperience`   | Y                 | default     | Lazy loaded                                            |
| `/system`                | `./components/admin/AdminDashboard`             | Y                 | default     | Lazy loaded                                            |
| `/admin/osint-feeds`     | `./components/admin/OSINTFeedConfig`            | Y                 | default     | Lazy loaded                                            |
| `/wargame-dashboard`     | `./features/wargame/ExecutiveDashboard`         | Y                 | default     | Lazy loaded                                            |
| `/alerting`              | `./pages/AlertingPage`                          | Y                 | default     | Lazy loaded                                            |
| `/plugins`               | `./pages/Plugins/InstalledPlugins`              | Y                 | default     | Lazy loaded                                            |
| `/integrations`          | `./pages/Integrations/IntegrationCatalog`       | Y                 | default     | Lazy loaded                                            |
| `/security`              | `./pages/Security/SecurityDashboard`            | Y                 | default     | Lazy loaded                                            |
| `/compliance`            | `./pages/Compliance/ComplianceCenter`           | Y                 | default     | Lazy loaded                                            |
| `/sandbox`               | `./pages/Sandbox/SandboxDashboard`              | Y                 | default     | Lazy loaded                                            |
| `/ops/release-readiness` | `./routes/ReleaseReadinessRoute`                | Y                 | default     | Lazy loaded                                            |
| `*`                      | (inline)                                        | Y                 | n/a         | `NotFoundPage` defined in `App.router.jsx`             |
