# Application Route Inventory

This document tracks the classification of all application routes for GA readiness.

| Route Path | Component | Classification | Notes |
|Str|Str|Str|Str|
|---|---|---|---|
| `/signin` | `SignInPage` | GA (Auth) | |
| `/signup` | `SignupPage` | GA (Auth) | |
| `/verify-email` | `VerifyEmailPage` | GA (Auth) | |
| `/access-denied` | `AccessDeniedPage` | GA (Auth) | |
| `/maestro/*` | `MaestroDashboard` | GA | Maestro Orchestration |
| `/trust` | `TrustDashboard` | GA | Trust Center |
| `/workbench` | `WorkbenchShell` | GA | Workbench |
| `/` | `HomePage` | GA | Landing |
| `/explore` | `ExplorePage` | GA | Data Exploration |
| `/analysis/tri-pane` | `TriPanePage` | GA | Analyst Tool |
| `/geoint` | `GeoIntPane` | GA | Analyst Tool |
| `/analysis/narrative` | `NarrativeIntelligencePage` | GA | Analyst Tool |
| `/alerts` | `AlertsPage` | GA | Operations |
| `/alerts/:id` | `AlertDetailPage` | GA | Operations |
| `/cases` | `CasesPage` | GA | Operations |
| `/cases/:id` | `CaseDetailPage` | GA | Operations |
| `/dashboards/command-center` | `CommandCenterDashboard` | GA | Dashboard |
| `/dashboards/supply-chain` | `SupplyChainDashboard` | GA | Dashboard |
| `/dashboards/advanced` | `AdvancedDashboardPage` | GA | Dashboard |
| `/internal/command` | `InternalCommandDashboard` | Operator | Internal Tool |
| `/mission-control` | `MissionControlPage` | GA | Mission Control |
| `/data/sources` | `DataSourcesPage` | GA | Data Management |
| `/models` | `ModelsPage` | GA | Model Management |
| `/reports` | `ReportsPage` | GA | Reporting |
| `/admin/*` | `AdminPage` | Admin | Administration |
| `/admin/consistency` | `ConsistencyDashboard` | Admin | System Health |
| `/admin/feature-flags` | `FeatureFlagsPage` | Admin | Configuration |
| `/help` | `HelpPage` | GA | Support |
| `/changelog` | `ChangelogPage` | GA | Support |
| `/demo` | `DemoControlPage` | Demo | Gated by `demoModeEnabled` |
| `/onboarding` | `OnboardingWizard` | Inactive | Commented out |

## Access Control Policy

- **GA**: Available to all authenticated users with appropriate tenant permissions.
- **Admin**: Restricted to users with `admin` role.
- **Operator**: Restricted to internal operators or `super_admin`.
- **Demo**: Only available when `DEMO_MODE` feature flag is enabled.
