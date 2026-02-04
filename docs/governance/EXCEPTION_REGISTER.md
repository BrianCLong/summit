Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Exception Register

**Last Updated:** 2026-01-01

This document lists all known deviations from the "Definition of Done".
These are intentional exceptions that must be justified and eventually resolved.

## Soft Spot Summary

| Category         |  Count   |
| :--------------- | :------: |
| `test.skip`      |    36    |
| `describe.skip`  |    23    |
| `it.skip`        |    47    |
| `pytest.skip`    |    0     |
| `// @ts-ignore`  |   179    |
| `eslint-disable` |   825    |
| **Total**        | **1110** |

## Detailed Findings

| File                                                                         | Line | Pattern          | Justification   | Sunset Condition |
| :--------------------------------------------------------------------------- | :--: | :--------------- | :-------------- | :--------------- |
| `ai/cdis/tests/test_e2e_playwright.py`                                       |  19  | `test.skip`      | Legacy E2E test | Q1 2026          |
| `apps/a11y-lab/src/telemetry/guards.ts`                                      |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/api/tests/dual_control.spec.ts`                                        |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/api/tests/dual_control.spec.ts`                                        |  32  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/api/tests/dual_control.spec.ts`                                        |  36  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/gateway/server.js`                                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/gateway/src/lib/data/migration_flags.ts`                               |  52  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/gateway/src/middleware/audit_rfa.ts`                                   |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/intelgraph-api/src/index.ts`                                           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/intelgraph-api/src/lib/context.ts`                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/intelgraph-api/src/schema.ts`                                          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/mobile-interface/public/sw-custom.js`                                  |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/mobile-interface/public/sw-custom.js`                                  |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/mobile-interface/src/components/SearchBar.tsx`                         | 166  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/mobile-interface/src/hooks/useOffline.tsx`                             |  28  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/mobile-native/src/config/index.ts`                                     |  1   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/mobile-native/src/services/GraphQLClient.ts`                           |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/mobile-native/src/services/PerformanceMonitor.ts`                      |  78  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/web/public/mockServiceWorker.js`                                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/__tests__/designTokenLintRule.test.ts`                         |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/CommandPalette.tsx`                                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/MaestroRunConsole.tsx`                              | 439  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/__tests__/MaestroRunConsole.test.tsx`               |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/admin/UserManagement.tsx`                           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/admin/tenants/TenantManagement.tsx`                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/conductor/ConductorDashboard.tsx`                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/features/investigation/SnapshotManager.tsx`         |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/investigation/InvestigatorWorkbench.tsx`            |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/panels/PatternDetectionPanel.tsx`                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/tri-pane/EnhancedTriPaneView.tsx`                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/Spinner.tsx`                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/design-system.snap.test.tsx`                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Badge.stories.tsx`                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Button.stories.tsx`                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Dialog.stories.tsx`                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Feedback.stories.tsx`                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/FormControls.stories.tsx`                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/LoadingPrimitives.stories.tsx`           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Pagination.stories.tsx`                  |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/SwitchSlider.stories.tsx`                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Table.stories.tsx`                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Tabs.stories.tsx`                        |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/Toast.stories.tsx`                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/components/ui/stories/TooltipPopover.stories.tsx`              |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/config.ts`                                                     |  26  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/web/src/config.ts`                                                     |  28  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/web/src/config.ts`                                                     |  40  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/web/src/config.ts`                                                     |  42  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `apps/web/src/features/RunbookPlanner.tsx`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/algos-widget/AlgosWidget.tsx`                         |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/analyst-console/AnalystConsole.stories.tsx`           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/annotations/AnnotationPanel.tsx`                      | 109  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/annotations/annotationsSlice.ts`                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/federated-search/FederatedSearch.tsx`                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/focusMode/bindings.ts`                                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/growth/GrowthPlaybookGenerator.tsx`                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/history/historyMiddleware.ts`                         |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/internal-command/CommandStatusProvider.tsx`           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/internal-command/components/StatusPanel.tsx`          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/mission-control/MissionControlPage.tsx`               |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/review-queue/ReviewQueuePage.tsx`                     | 309  | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/security/CrossDomainTransferButton.tsx`               |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/triPane/TriPaneShell.new.test.tsx`                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/triPane/TriPaneShell.stories.skip.tsx`                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/triPane/TriPaneShell.stories.tsx`                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/triPane/mockData.ts`                                  |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/workflow/WorkflowPanel.tsx`                           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/features/workspaces/storage.ts`                                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/hooks/useCaseExportJob.test.ts`                                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/hooks/useExplainView.ts`                                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/hud/SystemHUD.tsx`                                             |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/lib/apollo.ts`                                                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/lib/otel-client.ts`                                            |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/lib/yjs/useCollaboration.ts`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/AdminDashboard.tsx`                                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/CreateTenantPage.tsx`                                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/GrowthPlaybookPage.tsx`                                  |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/NarrativeIntelligencePage.tsx`                           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/OPAPlaygroundPage.tsx`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/maestro/MaestroDashboard.tsx`                            |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/pages/maestro/pages/Runbooks.tsx`                              |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/panes/GeoIntPane.tsx`                                          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/panes/GraphIntelligencePane.tsx`                               |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/panes/GraphPane.tsx`                                           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/stories/Button.stories.tsx`                                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/stories/Input.stories.tsx`                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/stories/components.test.tsx`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/summitsight/ExecutiveDashboard.tsx`                            |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/src/theme/DesignSystemProvider.tsx`                                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 124  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 146  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 156  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 339  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 352  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 391  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 470  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 488  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/web/tests/tri-pane-view.spec.ts`                                       | 506  | `test.skip`      | _Pending_       | _TBD_            |
| `apps/webapp/cypress/support/e2e.ts`                                         |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `apps/webapp/cypress/support/e2e.ts`                                         |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `bindings/djce-pb/src/index.ts`                                              |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `bindings/ibrs-node/index.js`                                                |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/_stashed_archive/client/src/components/templates/TemplateModal.js`   |  24  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 147  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 155  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 163  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 171  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 221  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 223  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 225  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.js`                                                   | 227  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 147  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 155  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 163  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 171  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 221  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 223  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 225  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.apollo.jsx`                                                  | 227  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.basic.js`                                                    |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.basic.js`                                                    | 140  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.basic.jsx`                                                   |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.basic.jsx`                                                   | 140  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.js`                                              | 141  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.js`                                              | 143  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.js`                                              | 145  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.jsx`                                             | 141  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.jsx`                                             | 143  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.progressive.jsx`                                             | 145  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 146  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 723  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 725  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 727  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 729  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.js`                                                   | 731  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.jsx`                                                  | 835  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.jsx`                                                  | 837  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.jsx`                                                  | 839  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.jsx`                                                  | 841  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.router.jsx`                                                  | 843  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.simple.js`                                                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.simple.jsx`                                                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.test-simple.js`                                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.test-simple.jsx`                                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.working.js`                                                  |  81  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.working.js`                                                  |  83  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.working.jsx`                                                 |  81  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/App.working.jsx`                                                 |  83  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/ConductorToolsEvidence.test.tsx`                       |  22  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/ConductorToolsEvidence.test.tsx`                       |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/ConductorToolsEvidence.test.tsx`                       |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/ConductorToolsEvidence.test.tsx`                       |  43  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/ConductorToolsEvidence.test.tsx`                       |  47  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/MCPRegistry.test.tsx`                                  |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/MCPRegistry.test.tsx`                                  |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/MCPRegistry.test.tsx`                                  |  22  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/__tests__/MCPRegistry.test.tsx`                                  |  26  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/apollo/createApolloClient.ts`                                    |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/apollo/createApolloClient.ts`                                    |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/apollo/createApolloClient.ts`                                    |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/apollo/createApolloClient.ts`                                    | 168  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/auth/withAuthorization.tsx`                                      |  85  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/auth/withAuthorization.tsx`                                      | 185  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/auth/withAuthorization.tsx`                                      | 190  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  8   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdminPanel.tsx`                                       |  60  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdvancedSearch.tsx`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdvancedSearch.tsx`                                   |  32  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdvancedSearch.tsx`                                   |  75  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/AdvancedSearch.tsx`                                   | 388  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ArtifactBusPanel.tsx`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ArtifactBusPanel.tsx`                                 |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ContractsPanel.tsx`                                   |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ContractsPanel.tsx`                                   |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  3   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  45  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  62  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     |  82  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 101  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 178  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 206  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 419  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 425  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 547  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 553  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/CounterIntelligenceDashboard.tsx`                     | 559  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataExport.tsx`                                       |  36  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataExport.tsx`                                       |  43  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataExport.tsx`                                       |  69  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataExport.tsx`                                       | 194  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataExport.tsx`                                       | 430  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataIntegrityIndicators.tsx`                          | 315  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/DataIntegrityIndicators.tsx`                          | 343  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/EntityDrawer.tsx`                                     |  64  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/EntityFilterPanel.tsx`                                |  51  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/EntityFilterPanel.tsx`                                |  85  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/EntityFilterPanel.tsx`                                | 146  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/EntityFilterPanel.tsx`                                | 153  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/FileUpload.tsx`                                       |  79  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/FileUpload.tsx`                                       |  81  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/FlowLintPanel.tsx`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/FlowLintPanel.tsx`                                    |  48  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GAReleaseStatus.tsx`                                  |  95  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphCanvas.tsx`                                      |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     |  13  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     |  47  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     |  49  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     |  69  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     |  76  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     | 104  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     | 141  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/GraphPreview.tsx`                                     | 197  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/HelpSystem.tsx`                                       | 545  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/HelpSystem.tsx`                                       | 582  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     |  61  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     |  93  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     | 153  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IngestWizard.tsx`                                     | 165  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  8   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  21  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  26  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  28  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  30  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      | 385  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      | 448  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.js`                                      | 482  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  8   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  21  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  26  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  28  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  30  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     | 385  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     | 448  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     | 482  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InsightPanel.jsx`                                     | 493  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  22  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  24  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  31  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  39  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  50  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  73  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              |  83  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 113  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 128  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 130  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 139  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 249  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 317  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 329  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 714  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 716  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 730  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 734  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 763  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 776  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 793  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 797  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 812  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 832  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/IntelGraphWorkbench.tsx`                              | 858  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             |  64  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             |  80  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 104  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 132  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 190  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 549  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 582  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 616  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationManager.tsx`                             | 644  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationPresence.js`                             |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/InvestigationPresence.jsx`                            |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/KeyboardShortcuts.tsx`                                |  81  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/KeyboardShortcuts.tsx`                                | 137  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/KeyboardShortcuts.tsx`                                | 255  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/MaestroUI/WorkflowDashboard.tsx`                      | 193  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/MaestroUI/WorkflowDashboard.tsx`                      | 200  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/MagicSearch.tsx`                                      |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/MagicSearch.tsx`                                      |  48  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/GeospatialDashboard.tsx`                          |  14  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/GeospatialDashboard.tsx`                          |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/MapContainer.tsx`                                 |  82  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/MapContainer.tsx`                                 | 115  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/MapContainer.tsx`                                 | 121  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/index.tsx`                                        |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/GeoJSONLayer.tsx`                          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/GeoJSONLayer.tsx`                          |  79  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/GeoJSONLayer.tsx`                          | 118  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/HeatmapLayer.tsx`                          |  96  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/MarkerLayer.tsx`                           |  78  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/MarkerLayer.tsx`                           |  95  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Map/layers/MarkerLayer.tsx`                           |  98  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Navigation.tsx`                                       |  16  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Navigation.tsx`                                       |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Navigation.tsx`                                       |  25  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/Navigation.tsx`                                       |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               |  53  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               |  70  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               | 113  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               | 130  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/NotificationSystem.tsx`                               | 208  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/PerformanceMonitor.tsx`                               |  31  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/PerformanceMonitor.tsx`                               |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/PerformanceMonitor.tsx`                               | 225  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/PerformanceMonitor.tsx`                               | 240  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/PerformanceMonitor.tsx`                               | 242  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ToastContainer.tsx`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ToastContainer.tsx`                                   |  66  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/__tests__/ErrorBoundary.test.tsx`                     |  16  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ai/AIAnalysisPanel.jsx`                               |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ai/__tests__/NlGraphQueryExplainer.test.tsx`          |  38  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ai/__tests__/NlGraphQueryExplainer.test.tsx`          |  64  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ai/__tests__/NlGraphQueryExplainer.test.tsx`          |  88  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/ai-enhanced/test-utils/fetch.ts`                      |  27  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/src/components/ai-enhanced/test-utils/flush.ts`                      |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/src/components/collab/ParticipantSelector.tsx`                       |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/collab/ParticipantSelector.tsx`                       |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/collab/WarRoomCreationModal.tsx`                      |  31  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/common/DemoIndicator.jsx`                             |  50  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/common/DemoIndicator.test.jsx`                        |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/common/ErrorBoundary.tsx`                             | 118  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/explorer/KGExplorer.tsx`                              | 249  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/templates/TemplateModal.js`                           |  24  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/templates/TemplateModal.jsx`                          |  24  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                |  31  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                | 305  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                | 333  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                | 335  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                | 457  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/components/trust-center/TrustCenterDashboard.tsx`                | 564  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/design-system/DesignSystemProvider.tsx`                          |  14  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/design-system/DesignSystemProvider.tsx`                          |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/admin/AdminStudio.tsx`                                  | 538  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/admin/AdminStudio.tsx`                                  | 542  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/admin/AdminStudio.tsx`                                  | 553  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/approvals/ApprovalsPage.tsx`                            |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/approvals/ApprovalsPage.tsx`                            |  59  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/approvals/ApprovalsPage.tsx`                            |  90  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/companyos/pages/OperationsDashboard.tsx`                |  21  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/conductor/__tests__/RunSearch.test.tsx`                 |  24  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/conductor/__tests__/RunSearch.test.tsx`                 |  39  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/conductor/__tests__/RunSearch.test.tsx`                 |  50  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/conductor/panels/NLToCypherPreview.tsx`                 |  62  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/explorer/ExplorerContext.jsx`                           |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/link-analysis/LinkAnalysisCanvas.stories.tsx`           |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/link-analysis/LinkAnalysisCanvas.stories.tsx`           |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/link-analysis/LinkAnalysisCanvas.stories.tsx`           |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/maestro/pages/RunView.tsx`                              | 199  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/features/orchestrator/OrchestratorDashboard.tsx`                 |  3   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/flags/featureFlags.ts`                                           |  26  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/src/hooks/useCollaborationLog.js`                                    |  58  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  8   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  14  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  28  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  39  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useDashboardSocket.ts`                                     |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/usePerfMarkers.tsx`                                        |  9   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/usePerfMarkers.tsx`                                        |  18  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/usePerfMarkers.tsx`                                        |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/usePerfMarkers.tsx`                                        |  58  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/usePolicies.ts`                                            | 116  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/hooks/useSafeQuery.ts`                                           |  57  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/lib/assistant/transport.test.ts`                                 |  23  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/src/pages/AlertingPage.tsx`                                          |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/AlertingPage.tsx`                                          |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/Hunting/HuntList.tsx`                                      | 277  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/WebhookDashboard.jsx`                                      | 276  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/finops/FinOpsDashboard.tsx`                                | 142  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  51  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  53  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  72  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    |  90  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 113  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 164  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 171  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 178  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 200  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 209  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/PartnerConsolePage.tsx`                    | 213  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/billing/PartnerBillingPanel.tsx`           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/pages/partner-console/billing/PartnerBillingPanel.tsx`           |  71  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/routes/OsintStudio.tsx`                                          |  92  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              |  72  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              |  78  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              |  91  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              |  96  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              | 102  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/services/socket.js`                                              | 108  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/ApprovalsExperience.tsx`                   |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/ApprovalsExperience.tsx`                   | 107  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/ApprovalsList.tsx`                         |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/ApprovalsList.tsx`                         |  80  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/__tests__/ApprovalsExperience.test.tsx`    |  60  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/__tests__/ApprovalsExperience.test.tsx`    |  92  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 156  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 179  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 196  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 199  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 210  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 221  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 232  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 251  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 278  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/approvals/hooks.ts`                                  | 410  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/switchboard/audit/AuditTimeline.tsx`                             |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/tests/collab/WarRoomCreationModal.test.tsx`                      |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                |  45  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                |  52  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                |  58  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 108  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 110  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 202  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 210  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 328  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/src/utils/data-envelope-validator.ts`                                | 352  | `eslint-disable` | _Pending_       | _TBD_            |
| `client/tests/fuzz/framed-stream.test.ts`                                    |  62  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/tests/fuzz/framed-stream.test.ts`                                    |  96  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `client/tests/fuzz/framed-stream.test.ts`                                    | 119  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `companyos/scripts/enforce-trivy-budget.js`                                  |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `companyos/scripts/generate-disclosure-pack.js`                              |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `companyos/scripts/smoke-companyos.ts`                                       |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `companyos/scripts/smoke-companyos.ts`                                       |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `companyos/scripts/smoke-companyos.ts`                                       |  36  | `eslint-disable` | _Pending_       | _TBD_            |
| `companyos/services/companyos-api/src/telemetry/events.ts`                   |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/App.js`                                           |  87  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/App.tsx`                                          |  94  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/mutations/SafeMutations.ts`               | 433  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CICD.a11y.test.js`        |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CICD.a11y.test.js`        |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CICD.a11y.test.tsx`       |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CICD.a11y.test.tsx`       |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CompareRun.a11y.test.js`  |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CompareRun.a11y.test.js`  |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CompareRun.a11y.test.tsx` |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/pages/__tests__/CompareRun.a11y.test.tsx` |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/utils/supplyChainVerification.ts`         | 336  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/utils/supplyChainVerification.ts`         | 390  | `eslint-disable` | _Pending_       | _TBD_            |
| `conductor-ui/frontend/src/maestro/utils/supplyChainVerification.ts`         | 497  | `eslint-disable` | _Pending_       | _TBD_            |
| `docs/maestro/maestro-ui-next-patches-0901b/new_files/a11yDev.ts`            |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `docs/maestro/maestro-ui-next-patches-0901b/new_files/a11yDev.ts`            |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `docs-site/sw.js`                                                            |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `e2e/a11y/maestro.a11y.spec.ts`                                              |  14  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/attack-surface.spec.ts`                                                 |  6   | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/client/collab-delta-sync.spec.ts`                                       |  3   | `describe.skip`  | _Pending_       | _TBD_            |
| `e2e/client/graph-advanced.spec.ts`                                          |  31  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `e2e/maestro-run-console.spec.ts`                                            |  7   | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/maestro.a11y.fixed.spec.ts`                                             |  13  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/maestro.a11y.fixed.spec.ts`                                             |  73  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/maestro.a11y.fixed.spec.ts`                                             | 110  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/maestro.a11y.spec.ts`                                                   |  20  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/provenance.spec.ts`                                                     |  6   | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/provenance.spec.ts`                                                     |  32  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/provenance.spec.ts`                                                     |  38  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/provenance.spec.ts`                                                     |  43  | `test.skip`      | _Pending_       | _TBD_            |
| `e2e/provenance.spec.ts`                                                     |  54  | `test.skip`      | _Pending_       | _TBD_            |
| `ga-graphai/packages/c2pa-bridge/tests/c2pa-bridge.test.js`                  |  28  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/common-types/src/events.ts`                             | 360  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/gateway/src/chaos.js`                                   | 125  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/gateway/tests/fuzz.gateway.test.ts`                     |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/meta-orchestrator/src/prompt/autonomousEvolution.ts`    | 264  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/meta-orchestrator/src/telemetry.ts`                     |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `ga-graphai/packages/prov-ledger/src/proto/prov-ledger.ts`                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `gateway/graphql-bff/src/index.ts`                                           |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `gateway/graphql-bff/src/index.ts`                                           |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `gh_velocity_distance.js`                                                    |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        |  32  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        |  90  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        | 152  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        | 206  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        | 274  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        | 316  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/airgap/tests/test_policies.py`                                        | 356  | `test.skip`      | _Pending_       | _TBD_            |
| `infra/registry/observability.ts`                                            |  63  | `eslint-disable` | _Pending_       | _TBD_            |
| `libs/flags/node/index.js`                                                   | 134  | `eslint-disable` | _Pending_       | _TBD_            |
| `libs/flags/node/index.ts`                                                   | 171  | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/__tests__/sync.test.ts`                                          |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/__tests__/sync.test.ts`                                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/screens/DashboardScreen.tsx`                                     |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/screens/DocumentsScreen.tsx`                                     |  69  | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/services/offlineStore.ts`                                        |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `mobile/src/services/offlineStore.ts`                                        |  40  | `eslint-disable` | _Pending_       | _TBD_            |
| `operator-kit/server/index.ts`                                               |  85  | `eslint-disable` | _Pending_       | _TBD_            |
| `operator-kit/server/policy.ts`                                              |  94  | `eslint-disable` | _Pending_       | _TBD_            |
| `ops/bug-bash/report.ts`                                                     | 267  | `eslint-disable` | _Pending_       | _TBD_            |
| `ops/bug-bash/report.ts`                                                     | 272  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/adapter-sdk/src/testing/run-contract-tests.ts`                     |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/adapter-sdk/src/testing/run-contract-tests.ts`                     |  18  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/adapter-sdk/src/testing/run-contract-tests.ts`                     |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/adapter-sdk/src/testing/run-contract-tests.ts`                     |  25  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/agent-lab/bin/agent-lab.js`                                        |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/api-gateway/src/gateway.ts`                                        |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/business-rules/src/index.ts`                                       | 126  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/business-rules/src/index.ts`                                       | 128  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/cli/src/client.ts`                                                 |  9   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/cli/src/commands/auth.ts`                                          |  11  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/cli/src/commands/plugin.ts`                                        |  11  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/cli/src/index.ts`                                                  |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/cli/src/utils.ts`                                                  |  9   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/connectors/src/__tests__/discovery.test.ts`                        |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/connectors/src/conformance/fakeConnector.ts`                       |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/covert-ops-module/src/encryptedComms.js`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/covert-ops-module/src/encryptedComms.js`                           |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/error-handling/src/middleware.ts`                                  |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/golden-path/template/cmd/server.ts`                                |  61  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/influence-mining/src/cli.ts`                                       | 127  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/influence-mining/src/cli.ts`                                       | 131  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/jira-integration/src/logger.ts`                                    |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/kafka-integration/src/admin.ts`                                    |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/kafka-integration/src/consumer.ts`                                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/kafka-integration/src/partitioner.ts`                              |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/kafka-integration/src/producer.ts`                                 |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/kafka-integration/src/schema-registry.ts`                          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/liquid-nano/src/runtime/logger.js`                                 |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/liquid-nano/src/runtime/logger.ts`                                 |  26  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/config.ts`                                |  38  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/config.ts`                                |  46  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/config.ts`                                |  53  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  11  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  13  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/deploy.ts`                                |  21  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/dsar.ts`                                  |  14  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/dsar.ts`                                  |  31  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/init.ts`                                  |  47  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/logs.ts`                                  |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/logs.ts`                                  |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/logs.ts`                                  |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/logs.ts`                                  |  25  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/logs.ts`                                  |  29  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  33  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  38  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  40  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  42  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  46  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  48  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/plan.ts`                                  |  52  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/status.ts`                                |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/status.ts`                                |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/status.ts`                                |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/status.ts`                                |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/status.ts`                                |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/template.ts`                              |  32  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/template.ts`                              |  36  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/template.ts`                              |  46  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/template.ts`                              |  50  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/maestro-cli/src/commands/template.ts`                              |  71  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/narrative-engine/src/telemetry.ts`                                 |  51  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/neural-networks/src/index.ts`                                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/object-detection/src/tracker.ts`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/object-detection/src/yolo-detector.ts`                             |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/platform-benchmarks/src/cli.ts`                                    |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/plugin-sdk/src/testing/PluginTestHarness.ts`                       |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/plugin-sdk/src/testing/PluginTestUtils.ts`                         |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/plugin-system/src/core/PluginManager.ts`                           | 301  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/prov-ledger/src/cli.ts`                                            |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/prov-ledger-client/src/bin/ig-prov.ts`                             |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/prov-ledger-client/src/index.ts`                                   |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/provenance/__tests__/receipt-fuzz.test.ts`                         | 121  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/psyops-module/src/index.ts`                                        |  3   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/psyops-module/src/index.ts`                                        |  13  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/psyops-module/src/index.ts`                                        |  22  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/data-quality-js/test/index.test.ts`                            |  5   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/sdk/generated/core/ApiError.ts`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/core/ApiRequestOptions.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/core/ApiResult.ts`                                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/core/CancelablePromise.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/core/OpenAPI.ts`                                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/index.ts`                                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/AnalysisResult.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Annotation.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/AuditEvent.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/AuthResponse.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Case.ts`                                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CaseExport.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Collaborator.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Connector.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/ConnectorSchema.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CookbookQuery.ts`                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CostEstimate.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CreateEntityRequest.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CreateGraphRequest.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/CreateRelationshipRequest.ts`                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Entity.ts`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Error.ts`                                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/FeatureFlag.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Graph.ts`                                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/GraphSummary.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/HealthStatus.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/IngestJob.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/JobStatus.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/LinkPrediction.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Pagination.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/QueryResult.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Relationship.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/SafetyClassification.ts`                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/ServiceHealth.ts`                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Suggestion.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/Tenant.ts`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/UpdateGraphRequest.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/models/User.ts`                                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$AnalysisResult.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Annotation.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$AuditEvent.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$AuthResponse.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Case.ts`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CaseExport.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Collaborator.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Connector.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$ConnectorSchema.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CookbookQuery.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CostEstimate.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CreateEntityRequest.ts`                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CreateGraphRequest.ts`                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$CreateRelationshipRequest.ts`               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Entity.ts`                                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Error.ts`                                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$FeatureFlag.ts`                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Graph.ts`                                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$GraphSummary.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$HealthStatus.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$IngestJob.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$JobStatus.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$LinkPrediction.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Pagination.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$QueryResult.ts`                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Relationship.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$SafetyClassification.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$ServiceHealth.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Suggestion.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$Tenant.ts`                                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$UpdateGraphRequest.ts`                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/schemas/$User.ts`                                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/AdminService.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/AiEnhancementService.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/AnalyticsService.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/AuthenticationService.ts`                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/CasesService.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/CollaborationService.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/CopilotService.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/EntitiesService.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/EvidenceService.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/GraphAnalyticsService.ts`                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/IngestService.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/RelationshipsService.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/SystemService.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/TriageService.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/generated/services/VersioningService.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/client/PolicyClient.ts`                                    |  10  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/client/SummitClient.ts`                                    |  11  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/IntelGraphCoreClient.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/ApiError.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/ApiRequestOptions.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/ApiResult.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/BaseHttpRequest.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/CancelablePromise.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/FetchHttpRequest.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/OpenAPI.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/request.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/core/request.ts`                                 |  45  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/index.ts`                                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/AnalysisResult.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/AuthResponse.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Collaborator.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/CreateEntityRequest.ts`                   |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/CreateGraphRequest.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/CreateRelationshipRequest.ts`             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Entity.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Error.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Graph.ts`                                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphCoverage.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphExportFilters.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphExportJob.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphExportRequest.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphGovernance.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphInsight.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphInsightEntityRef.ts`                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphInsightsResponse.ts`                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/GraphSummary.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/HealthStatus.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/JobStatus.ts`                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Pagination.ts`                            |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/QueryResult.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/Relationship.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/ServiceHealth.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/UpdateGraphRequest.ts`                    |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/models/User.ts`                                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$AnalysisResult.ts`                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$AuthResponse.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Collaborator.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$CreateEntityRequest.ts`                 |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$CreateGraphRequest.ts`                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$CreateRelationshipRequest.ts`           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Entity.ts`                              |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Error.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Graph.ts`                               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphCoverage.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphExportFilters.ts`                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphExportJob.ts`                      |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphExportRequest.ts`                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphGovernance.ts`                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphInsight.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphInsightEntityRef.ts`               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphInsightsResponse.ts`               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$GraphSummary.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$HealthStatus.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$JobStatus.ts`                           |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Pagination.ts`                          |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$QueryResult.ts`                         |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$Relationship.ts`                        |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$ServiceHealth.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$UpdateGraphRequest.ts`                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/schemas/$User.ts`                                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/AiEnhancementService.ts`                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/AuthenticationService.ts`               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/CollaborationService.ts`                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/EntitiesService.ts`                     |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/GraphAnalyticsService.ts`               |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/RelationshipsService.ts`                |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/src/generated/services/SystemService.ts`                       |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/tests/contracts.test.ts`                                       |  21  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/tests/contracts.test.ts`                                       |  37  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sdk/tests/contracts.test.ts`                                       |  49  | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/sim-harness/src/__tests__/integration.test.ts`                     |  15  | `describe.skip`  | _Pending_       | _TBD_            |
| `packages/spatial-analysis/src/temporal/movement-patterns.ts`                |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `packages/telemetry-config/index.ts`                                         |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/telemetry-config/index.ts`                                         |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/telemetry-config/index.ts`                                         |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/telemetry-config/index.ts`                                         |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `packages/telemetry-config/index.ts`                                         |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `pbs/tools/pbs-dashboard/src/cli.ts`                                         |  39  | `eslint-disable` | _Pending_       | _TBD_            |
| `pbs/tools/pbs-dashboard/src/cli.ts`                                         |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `platform/chm/src/events.ts`                                                 |  27  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `platform/chm/src/scripts/migrate.ts`                                        |  23  | `eslint-disable` | _Pending_       | _TBD_            |
| `platform/device-trust/node/src/server.js`                                   | 129  | `eslint-disable` | _Pending_       | _TBD_            |
| `platform/device-trust/node/src/server.js`                                   | 135  | `eslint-disable` | _Pending_       | _TBD_            |
| `platform/device-trust/tools/policy-simulator.js`                            |  35  | `eslint-disable` | _Pending_       | _TBD_            |
| `platform/device-trust/tools/policy-simulator.js`                            |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `reliability/plan-regression/update-baseline.ts`                             |  84  | `eslint-disable` | _Pending_       | _TBD_            |
| `reliability/plan-regression/update-baseline.ts`                             |  94  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ci/validate-pr-metadata.ts`                                         |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ci/validate-pr-metadata.ts`                                         | 110  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ci/validate-pr-metadata.ts`                                         | 144  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ci/verify-prompt-integrity.ts`                                      |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ci/verify-prompt-integrity.ts`                                      |  50  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/compliance/check-controls.ts`                                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/data-quality/run-dq-checks.ts`                                      |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/express5_router_sweep.ts`                                           |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/feature-flag-manager.js`                                            |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/ga-gate.js`                                                         | 260  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/generate-test-suite.ts`                                             | 307  | `test.skip`      | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  12  | `test.skip`      | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  13  | `describe.skip`  | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  14  | `it.skip`        | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  15  | `test.skip`      | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  16  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `scripts/governance/scan_debt.ts`                                            |  17  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/infra/validate-multi-region.ts`                                     |  90  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `scripts/onboarding/bootcamp-check.ts`                                       | 225  | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/pr-risk-score.js`                                                   |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/refresh-plan-stats.js`                                              |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/select-pm.js`                                                       |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/smoke-test.js`                                                      |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `scripts/update_github_issues.js`                                            |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `sdk/typescript/sdk/ts/src/generated/index.ts`                               |  64  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/lib/config/config.d.ts`                                              |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/scripts/find_missing_docstrings.ts`                                  |  32  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/__tests__/trust-center-api.test.ts`                              |  31  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/ai/cognitiveTwins.ts`                                            |  45  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts`                         |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts`                         |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/audit/worm.ts`                                                   |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/backup/BackupService.ts`                                         | 231  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/bulk/BulkOperationService.ts`                                    | 183  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/bulk/__tests__/BulkOperationService.test.ts`                     |  42  | `test.skip`      | _Pending_       | _TBD_            |
| `server/src/bulk/__tests__/BulkOperationService.test.ts`                     |  69  | `test.skip`      | _Pending_       | _TBD_            |
| `server/src/cache/DistributedCacheService.ts`                                |  14  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/config/database.ts`                                              |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/connectors/__tests__/gcs-ingest.test.ts`                         |  32  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/cross-border/graphql/resolvers.ts`                               | 283  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/db/benchmarks/query-performance-benchmark.ts`                    |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/db/optimization/postgres-performance-optimizer.ts`               |  11  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/db/queryOptimizer.ts`                                            | 117  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/db/tenant.ts`                                                    |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/email-service/TemplateRenderer.ts`                               | 108  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/email-service/examples/usage.ts`                                 | 413  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/email-service/examples/usage.ts`                                 | 416  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/email-service/examples/usage.ts`                                 | 431  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/email-service/examples/usage.ts`                                 | 445  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/email-service/examples/usage.ts`                                 | 473  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/entity-resolution/__tests__/EntityResolution.test.ts`            |  34  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/entity-resolution/engine/FuzzyMatcher.ts`                        |  32  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/graphql/dataloaders/complianceAssessmentLoader.ts`               | 400  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/graphql/dataloaders/pluginConfigLoader.ts`                       | 393  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/graphql/dataloaders/policyVerdictLoader.ts`                      | 543  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/graphql/resolvers/graphragResolvers.ts`                          |  35  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/index.ts`                                                        |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/ingestion/migration/MigrationOrchestrator.ts`                    |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/lib/errors.ts`                                                   |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/lib/errors.ts`                                                   |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/maestro/core.ts`                                                 | 135  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/messaging/__tests__/MessagingService.test.ts`                    |  7   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/messaging/__tests__/MessagingService.test.ts`                    |  22  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/messaging/__tests__/MessagingService.test.ts`                    |  28  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/messaging/__tests__/MessagingService.test.ts`                    |  49  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/TieredRateLimitMiddleware.ts`                         | 298  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/__tests__/rateLimit.test.ts`                          |  90  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/__tests__/rateLimit.test.ts`                          | 110  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/audit-first.ts`                                       | 108  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/cacheHeaders.ts`                                      |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/graphql-validation-plugin.ts`                         |  25  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/middleware/security.ts`                                          |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/migrations/migrationFramework.ts`                                | 462  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/monitoring/middleware.ts`                                        |  42  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  14  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  17  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/monitoring/opentelemetry.ts`                                     |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/notifications/__tests__/NotificationService.test.ts`             |  23  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/notifications/__tests__/NotificationService.test.ts`             |  25  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/notifications/__tests__/NotificationService.test.ts`             |  31  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/notifications/__tests__/NotificationService.test.ts`             |  48  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/notifications/__tests__/NotificationService.test.ts`             | 117  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/observability/neo4j-instrumentation.ts`                          |  34  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/observability/neo4j-instrumentation.ts`                          |  56  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/observability/neo4j-instrumentation.ts`                          | 135  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/observability/neo4j-instrumentation.ts`                          | 154  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/observability/postgres-instrumentation.ts`                       | 101  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/observability/query-budget.ts`                                   |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/observability/query-budget.ts`                                   |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/observability/query-budget.ts`                                   |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/observability/redis-instrumentation.ts`                          |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/platform/maestro-core/event-store-memory.ts`                     |  21  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/policy/contracts.ts`                                             |  7   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/realtime/kafkaConsumer.ts`                                       |  1   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/realtime/kafkaConsumer.ts`                                       |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/realtime/maestro.ts`                                             |  5   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/repos/AuditAccessLogRepo.ts`                                     |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/repos/CaseRepo.ts`                                               |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/repos/EntityRepo.ts`                                             |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/repos/RelationshipRepo.ts`                                       |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  6   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  10  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/resolvers/WargameResolver.ts`                                    |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/retrieval/__tests__/RetrievalService.test.ts`                    |  34  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/routes/connectorRoutes.js`                                       |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/routes/federationRoutes.js`                                      |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/routes/tracingRoutes.js`                                         |  6   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/security/__tests__/airgap-vuln-manager.test.ts`                  | 138  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/__tests__/detection-platform.test.ts`                   | 102  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/__tests__/jwt-security.test.ts`                         |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/security/__tests__/jwt-security.test.ts`                         |  60  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/security/__tests__/llm-guardrails.test.ts`                       | 157  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/__tests__/llm-guardrails.test.ts`                       | 165  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/__tests__/llm-guardrails.test.ts`                       | 173  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/__tests__/llm-guardrails.test.ts`                       | 182  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/security/llm-guardrails.ts`                                      |  17  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/security/llm-guardrails.ts`                                      |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/AuthorizationService.ts`                                | 147  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/AuthorizationService.ts`                                | 163  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheInvalidationService.ts`                            |  14  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheInvalidationService.ts`                            |  16  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheInvalidationService.ts`                            |  20  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheWarmingService.ts`                                 |  15  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheWarmingService.ts`                                 |  17  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheWarmingService.ts`                                 |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CacheWarmingService.ts`                                 |  24  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CachedMetadataService.ts`                               |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CachedMetadataService.ts`                               |  29  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CopilotIntegrationService.ts`                           |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/CopilotIntegrationService.ts`                           |  7   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/DoclingService.ts`                                      |  3   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GACoremetricsService.ts`                                |  16  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GACoremetricsService.ts`                                | 109  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GraphIndexAdvisorService.ts`                            |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GraphIndexAdvisorService.ts`                            |  5   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GraphService.ts`                                        | 301  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/GraphService.ts`                                        | 315  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/MVP1RBACService.ts`                                     |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/MVP1RBACService.ts`                                     |  7   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SecuredLLMService.ts`                                   |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SecuredLLMService.ts`                                   |  21  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SecuredLLMService.ts`                                   |  24  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SecuredLLMService.ts`                                   |  74  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SimilarityService.ts`                                   |  44  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/SimilarityService.ts`                                   |  46  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/CognitiveMapperService.test.ts`               |  65  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/CryptoIntelligenceService.test.ts`            |  26  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/EntityResolutionService.test.ts`              |  31  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/services/__tests__/EntityResolutionService.test.ts`              |  45  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/services/__tests__/FeatureFlagService.test.ts`                   | 655  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/GraphConsistencyService.test.ts`              |  91  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/GraphConsistencyService.test.ts`              |  95  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/GraphConsistencyService.test.ts`              | 108  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/__tests__/auth.integration.test.ts`                     |  55  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/services/aiAnalysis.ts`                                          |  1   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/aiAnalysis.ts`                                          |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/correlation/AdvancedCorrelationEngine.ts`               |  5   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/AnomalyCorrelationService.ts`       |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/AnomalyCorrelationService.ts`       |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/DeceptionDetectionEngine.ts`        |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/DeceptionDetectionEngine.ts`        |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/ThreatActorModelingService.ts`      |  9   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/counterintelligence/ThreatActorModelingService.ts`      |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/services/semantic-rag/__tests__/SemanticKGRAGService.test.ts`    | 549  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/temporal/lib/workflows.ts`                                       |  13  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/tests/IntelGraphService.test.ts`                                 |  39  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/tests/billingSink.test.ts`                                       |  14  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/tests/cases/scenarios/ScenarioService.test.ts`                   |  28  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/tests/cases/scenarios/ScenarioService.test.ts`                   |  32  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/tests/entityResolution.guards.test.ts`                           |  13  | `test.skip`      | _Pending_       | _TBD_            |
| `server/src/tests/entityResolution.normalization.test.ts`                    |  8   | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/tests/er/EntityResolutionV2Service.test.ts`                      | 100  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/src/tests/sandbox.test.ts`                                           |  21  | `it.skip`        | _Pending_       | _TBD_            |
| `server/src/utils/CircuitBreaker.ts`                                         |  1   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/utils/CircuitBreaker.ts`                                         |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/utils/crypto-secure-random.ts`                                   |  25  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/utils/dataRedaction.ts`                                          |  2   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/utils/dataRedaction.ts`                                          |  5   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/utils/input-sanitization.ts`                                     | 396  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/utils/logger.ts`                                                 |  1   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/utils/logger.ts`                                                 |  12  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                |  63  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 103  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 145  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 147  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 149  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 188  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 190  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 192  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 224  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 226  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 229  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 265  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 268  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 299  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 301  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 304  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 397  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 449  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 451  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 455  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 642  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 657  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 698  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 707  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 738  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 779  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 782  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 805  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/MutationValidators.ts`                                | 808  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             |  85  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             |  88  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             |  91  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 114  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 117  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 120  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 156  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 164  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 166  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/validation/index.ts`                                             | 171  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/wasmRunner.ts`                                                   |  26  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/wasmRunner.ts`                                                   |  41  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/wasmRunner.ts`                                                   |  49  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/src/websocket/connectionManager.ts`                                  |  41  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/websocket/connectionManager.ts`                                  |  43  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/websocket/connectionManager.ts`                                  |  45  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/src/websocket/connectionManager.ts`                                  |  47  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/srcs/repos/__tests__/EntityRepo.perf.test.ts`                        |  15  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/EntityResolution.test.ts`                                      |  40  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/adversarial/abuse_and_bypass.test.ts`                          |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/analyticsBridge.int.test.js`                                   |  15  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/attack-surface.test.ts`                                        |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/attack-surface.test.ts`                                        |  25  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/audit-first.test.ts`                                           |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/auditTimeline.int.test.ts`                                     |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/tests/auditTimeline.int.test.ts`                                     |  14  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/connectors/connectors.test.ts`                                 |  68  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/db/db-health-report.integration.test.ts`                       |  31  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/db/managed-migration-index.integration.test.ts`                |  12  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/tests/db/managed-migration-index.integration.test.ts`                |  22  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/exports/provenance-export.test.ts`                             |  23  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/ga/context-graph.check.ts`                                     |  14  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/ga/context-graph.check.ts`                                     |  23  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/github-app-raw-body.spec.ts`                                   |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/github-raw-body.spec.ts`                                       |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/graphops.cache.int.test.js`                                    |  9   | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/hybrid-er.service.test.js`                                     |  2   | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/integration/auth.integration.test.ts`                          |  65  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/integration/graphql.test.ts`                                   |  8   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/tests/integration/graphql.test.ts`                                   |  16  | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/lib/streaming/stress.test.ts`                                  |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/lib/streaming/stress.test.ts`                                  |  24  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/lib/streaming/stress.test.ts`                                  |  46  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/n8n-raw-body.spec.ts`                                          |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/services/DefensivePsyOpsService.test.ts`                       |  20  | `eslint-disable` | _Pending_       | _TBD_            |
| `server/tests/services/OnboardingService.test.ts`                            |  66  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/services/OnboardingService.test.ts`                            |  87  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/services/OnboardingService.test.ts`                            | 116  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/services/RedTeamSimulator.test.ts`                             |  5   | `eslint-disable` | _Pending_       | _TBD_            |
| `server/tests/services/graphstore.spec.ts`                                   |  7   | `describe.skip`  | _Pending_       | _TBD_            |
| `server/tests/sigint/SigIntPlatform.test.ts`                                 |  64  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/slack-raw-body.spec.ts`                                        |  11  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/socket-auth-rbac.test.ts`                                      |  29  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/streaming/Chaos.test.ts`                                       |  57  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/streaming/StreamProcessor.test.ts`                             |  55  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `server/tests/stripe-connect-raw-body.spec.ts`                               |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/stripe-raw-body.spec.ts`                                       |  10  | `it.skip`        | _Pending_       | _TBD_            |
| `server/tests/utils/esmMock.ts`                                              |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `services/api/src/graphql/__tests__/abac_opa.int.test.ts`                    |  5   | `describe.skip`  | _Pending_       | _TBD_            |
| `services/authz-gateway/src/audit.ts`                                        | 142  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/authz-gateway/src/security/phase1-cli.ts`                          |  60  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/authz-gateway/src/security/phase1-cli.ts`                          |  64  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/authz-gateway/tests/adapter-simulation.test.ts`                    |  96  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/cep/src/server.js`                                                 |  44  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/csr/src/index.ts`                                                  |  80  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/dev-gateway/otel.js`                                               |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `services/dev-gateway/server.js`                                             |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `services/er-service/tests/lock-contention.harness.test.ts`                  |  32  | `describe.skip`  | _Pending_       | _TBD_            |
| `services/er-service/tests/lock-contention.harness.test.ts`                  |  96  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/er-service/tests/unit/identity-cluster-repository.test.ts`         |  18  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/exporter/src/pdf.ts`                                               |  15  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/mtif/src/server.ts`                                                | 137  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/realtime/src/index.ts`                                             |  71  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `services/receipt-worker/src/ReceiptWorker.ts`                               | 124  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/receipt-worker/src/metrics/server.ts`                              |  27  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/stix-taxii-ingestion/src/storage/Neo4jGraphStore.ts`               |  9   | `eslint-disable` | _Pending_       | _TBD_            |
| `services/talent-magnet/src/utils/logger.ts`                                 |  19  | `eslint-disable` | _Pending_       | _TBD_            |
| `services/talent-magnet/src/utils/logger.ts`                                 |  22  | `eslint-disable` | _Pending_       | _TBD_            |
| `sim-harness/__tests__/integration.test.ts`                                  |  22  | `it.skip`        | _Pending_       | _TBD_            |
| `src/components/PyPlayground.tsx`                                            |  16  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `src/data-pipeline/pipeline.ts`                                              | 265  | `eslint-disable` | _Pending_       | _TBD_            |
| `src/digital-triplet/metrics.ts`                                             |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `test/jest.setup.js`                                                         |  4   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/e2e/ai-nlq.spec.ts`                                                   |  3   | `describe.skip`  | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          |  38  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          |  59  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          |  89  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 112  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 153  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 181  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 218  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 259  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 290  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 325  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 364  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 397  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 438  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 470  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 514  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 539  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 543  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 549  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 553  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 559  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/error-scenarios/api-error-scenarios.test.ts`                          | 563  | `it.skip`        | _Pending_       | _TBD_            |
| `tests/ga-gate.test.ts`                                                      |  1   | `eslint-disable` | _Pending_       | _TBD_            |
| `tests/integration/collaboration.spec.ts`                                    |  8   | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/integration/collaboration.spec.ts`                                    |  19  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/integration/graphql/entity.resolver.test.ts`                          |  40  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/integration/setup-tests.ts`                                           | 116  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/integration/setup-tests.ts`                                           | 118  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/integration/setup-tests.ts`                                           | 122  | `// @ts-ignore`  | _Pending_       | _TBD_            |
| `tests/plan-regression.test.ts`                                              |  71  | `describe.skip`  | _Pending_       | _TBD_            |
| `tests/smoke/02-auth.spec.ts`                                                |  17  | `test.skip`      | _Pending_       | _TBD_            |
| `tools/policy/check-helm-digests.js`                                         |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `tools/report-cli/index.js`                                                  |  2   | `eslint-disable` | _Pending_       | _TBD_            |
| `tools/report-cli/index.js`                                                  |  4   | `eslint-disable` | _Pending_       | _TBD_            |
| `tools/rules/miner.ts`                                                       |  64  | `eslint-disable` | _Pending_       | _TBD_            |

---

> **Control: Exception Register generated.**
> **Status: VERIFIED**
