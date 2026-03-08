"use strict";
/**
 * Control Tower Dashboard - Main operational command center
 * @module @intelgraph/web/pages/control-tower
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlTowerDashboard = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const HealthScoreCard_1 = require("../../components/control-tower/HealthScoreCard");
const ActiveSituations_1 = require("../../components/control-tower/ActiveSituations");
const KeyMetricsGrid_1 = require("../../components/control-tower/KeyMetricsGrid");
const TeamPulse_1 = require("../../components/control-tower/TeamPulse");
const EventTimeline_1 = require("../../components/control-tower/EventTimeline");
const CommandPalette_1 = require("../../components/control-tower/CommandPalette");
const EventDetailPanel_1 = require("../../components/control-tower/EventDetailPanel");
const useControlTowerData_1 = require("../../hooks/useControlTowerData");
const useKeyboardShortcuts_1 = require("../../hooks/useKeyboardShortcuts");
const utils_1 = require("@/lib/utils");
const DataIntegrityNotice_1 = require("../../components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("../../components/common/DemoIndicator");
const ControlTowerDashboard = ({ initialFilters = {}, }) => {
    const theme = (0, material_1.useTheme)();
    // State
    const [filters, setFilters] = (0, react_1.useState)(initialFilters);
    const [selectedEventId, setSelectedEventId] = (0, react_1.useState)(null);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = (0, react_1.useState)(false);
    const [isFilterPanelOpen, setFilterPanelOpen] = (0, react_1.useState)(false);
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    // Data fetching
    const { healthScore, keyMetrics, teamPulse, activeSituations, events, isLoading, error, refetch, } = (0, useControlTowerData_1.useControlTowerData)(filters);
    const showPlaceholder = isLoading || !isDemoMode;
    // Keyboard shortcuts
    (0, useKeyboardShortcuts_1.useKeyboardShortcuts)({
        'mod+k': () => setCommandPaletteOpen(true),
        'mod+f': () => setFilterPanelOpen(true),
        'escape': () => {
            setSelectedEventId(null);
            setCommandPaletteOpen(false);
            setFilterPanelOpen(false);
        },
    });
    // Handlers
    const handleEventSelect = (0, react_1.useCallback)((eventId) => {
        setSelectedEventId(eventId);
    }, []);
    const handleEventClose = (0, react_1.useCallback)(() => {
        setSelectedEventId(null);
    }, []);
    const handleFilterChange = (0, react_1.useCallback)((newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);
    const handleRefresh = (0, react_1.useCallback)(() => {
        refetch();
    }, [refetch]);
    const handleCommandSelect = (0, react_1.useCallback)((command, args) => {
        setCommandPaletteOpen(false);
        switch (command) {
            case 'search':
                handleFilterChange({ searchQuery: args?.query });
                break;
            case 'filter':
                setFilterPanelOpen(true);
                break;
            case 'refresh':
                handleRefresh();
                break;
            default:
                console.log('Command:', command, args);
        }
    }, [handleFilterChange, handleRefresh]);
    if (error) {
        return (<material_1.Box p={4} textAlign="center">
        <material_1.Typography color="error" variant="h6">
          Error loading Control Tower data
        </material_1.Typography>
        <material_1.Typography color="textSecondary">{error.message}</material_1.Typography>
      </material_1.Box>);
    }
    return (<material_1.Box sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.background.default,
        }}>
      {/* Header */}
      <material_1.Paper elevation={0} sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
        <material_1.Box display="flex" alignItems="center" gap={2}>
          <material_1.Typography variant="h5" fontWeight={600}>
            🎯 Control Tower
          </material_1.Typography>
        </material_1.Box>

        <material_1.Box display="flex" alignItems="center" gap={1}>
          {/* Search Button */}
          <material_1.Tooltip title={`Search (${utils_1.MODIFIER_KEY}K)`}>
            <material_1.IconButton onClick={() => setCommandPaletteOpen(true)}>
              <icons_material_1.Search />
            </material_1.IconButton>
          </material_1.Tooltip>

          {/* Filter Button */}
          <material_1.Tooltip title="Filters">
            <material_1.IconButton onClick={() => setFilterPanelOpen(true)}>
              <icons_material_1.FilterList />
            </material_1.IconButton>
          </material_1.Tooltip>

          {/* Refresh Button */}
          <material_1.Tooltip title="Refresh">
            <material_1.IconButton onClick={handleRefresh} disabled={isLoading}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Box>
      </material_1.Paper>

      {/* Main Content */}
      <material_1.Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
        }}>
        {!isDemoMode && (<material_1.Box mb={3}>
            <DataIntegrityNotice_1.DataIntegrityNotice mode="unavailable" context="Control tower"/>
          </material_1.Box>)}

        {/* Health Score */}
        <material_1.Box mb={3}>
          <HealthScoreCard_1.HealthScoreCard score={healthScore?.score ?? 0} trend={healthScore?.trend ?? 'STABLE'} change={healthScore?.change ?? 0} components={healthScore?.components ?? []} isLoading={showPlaceholder}/>
        </material_1.Box>

        {/* Active Situations & Key Metrics */}
        <material_1.Grid container spacing={3} mb={3}>
          <material_1.Grid item xs={12} md={5}>
            <ActiveSituations_1.ActiveSituations situations={activeSituations} onSituationClick={(id) => console.log('Situation clicked:', id)} isLoading={showPlaceholder}/>
          </material_1.Grid>

          <material_1.Grid item xs={12} md={7}>
            <material_1.Grid container spacing={2}>
              <material_1.Grid item xs={12}>
                <KeyMetricsGrid_1.KeyMetricsGrid metrics={keyMetrics} isLoading={showPlaceholder}/>
              </material_1.Grid>
              <material_1.Grid item xs={12}>
                <TeamPulse_1.TeamPulse members={teamPulse} isLoading={showPlaceholder}/>
              </material_1.Grid>
            </material_1.Grid>
          </material_1.Grid>
        </material_1.Grid>

        {/* Event Timeline */}
        <EventTimeline_1.EventTimeline events={events} filters={filters} onFilterChange={handleFilterChange} onEventSelect={handleEventSelect} selectedEventId={selectedEventId} isLoading={showPlaceholder}/>
      </material_1.Box>

      {/* Command Palette */}
      <CommandPalette_1.CommandPalette open={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onCommandSelect={handleCommandSelect}/>

      {/* Event Detail Panel */}
      <EventDetailPanel_1.EventDetailPanel eventId={selectedEventId} open={!!selectedEventId} onClose={handleEventClose}/>
    </material_1.Box>);
};
exports.ControlTowerDashboard = ControlTowerDashboard;
exports.default = exports.ControlTowerDashboard;
