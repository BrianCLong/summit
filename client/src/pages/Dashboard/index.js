"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
const react_1 = __importDefault(require("react"));
const Box_1 = __importDefault(require("@mui/material/Box"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const Paper_1 = __importDefault(require("@mui/material/Paper"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
const StatsOverview_1 = __importDefault(require("../../components/dashboard/StatsOverview"));
const LatencyPanels_1 = __importDefault(require("../../components/dashboard/LatencyPanels"));
const ErrorPanels_1 = __importDefault(require("../../components/dashboard/ErrorPanels"));
const ResolverTop5_1 = __importDefault(require("../../components/dashboard/ResolverTop5"));
const GrafanaLinkCard_1 = __importDefault(require("../../components/dashboard/GrafanaLinkCard"));
const LiveActivityFeed_1 = __importDefault(require("../../components/dashboard/LiveActivityFeed"));
const AIGovernanceWidget_1 = __importDefault(require("../../components/dashboard/AIGovernanceWidget"));
const usePrefetch_1 = require("../../hooks/usePrefetch");
function Dashboard() {
    // Prefetch critical dashboard data to eliminate panel pop-in
    (0, usePrefetch_1.useDashboardPrefetch)();
    (0, usePrefetch_1.useIntelligentPrefetch)();
    return (<Box_1.default p={2} aria-live="polite">
      <Grid_1.default container spacing={2}>
        <Grid_1.default item xs={12} md={6}>
          <Paper_1.default elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Typography_1.default variant="h6" gutterBottom>
              Stats Overview
            </Typography_1.default>
            <StatsOverview_1.default />
          </Paper_1.default>
        </Grid_1.default>
        <Grid_1.default item xs={12} md={6}>
          <LiveActivityFeed_1.default />
        </Grid_1.default>
        <Grid_1.default item xs={12} md={4}>
          <GrafanaLinkCard_1.default />
        </Grid_1.default>

        {/* AI Governance & Agent Fleet Dashboard */}
        <Grid_1.default item xs={12}>
          <AIGovernanceWidget_1.default />
        </Grid_1.default>

        <Grid_1.default item xs={12}>
          <Paper_1.default elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <LatencyPanels_1.default />
          </Paper_1.default>
        </Grid_1.default>

        <Grid_1.default item xs={12}>
          <Paper_1.default elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ErrorPanels_1.default />
          </Paper_1.default>
        </Grid_1.default>

        <Grid_1.default item xs={12}>
          <Paper_1.default elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <ResolverTop5_1.default />
          </Paper_1.default>
        </Grid_1.default>
      </Grid_1.default>
    </Box_1.default>);
}
