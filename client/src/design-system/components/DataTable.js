"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = void 0;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const x_data_grid_1 = require("@mui/x-data-grid");
const Replay_1 = __importDefault(require("@mui/icons-material/Replay"));
const DesignSystemProvider_1 = require("../DesignSystemProvider");
const tokens_1 = require("../tokens");
const DataTableToolbar = () => (<x_data_grid_1.GridToolbarContainer>
    <x_data_grid_1.GridToolbarQuickFilter debounceMs={200} placeholder="Filter by keyword"/>
  </x_data_grid_1.GridToolbarContainer>);
const DataTable = ({ rows, columns, loading = false, pageSize = 10, checkboxSelection = true, onSelectionChange, onRetry, emptyState, title, subtitle, }) => {
    const telemetry = (0, DesignSystemProvider_1.useDesignSystemTelemetry)();
    const theme = (0, material_1.useTheme)();
    const isMobile = (0, material_1.useMediaQuery)('(max-width:768px)');
    const [selectionModel, setSelectionModel] = react_1.default.useState([]);
    react_1.default.useEffect(() => {
        telemetry.record('DataTable', '1.0.0', {
            columns: columns.map((c) => c.field),
            hasBulk: checkboxSelection,
        });
    }, [columns, checkboxSelection, telemetry]);
    react_1.default.useEffect(() => {
        const spacingValue = theme.spacing ? theme.spacing(1) : tokens_1.lightTokens.spacing.sm;
        const normalized = typeof spacingValue === 'string' ? Number(spacingValue.replace('px', '')) : spacingValue;
        telemetry.validateStyle('DataTable', '1.0.0', { padding: normalized });
    }, [theme, telemetry]);
    const renderEmptyState = () => (<material_1.Box textAlign="center" p={4} role="status">
      <material_1.Typography variant="h6" gutterBottom>
        {emptyState?.title || 'No results found'}
      </material_1.Typography>
      <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
        {emptyState?.description || 'Try adjusting filters or refreshing the data source.'}
      </material_1.Typography>
      {onRetry && (<material_1.Button variant="outlined" startIcon={<Replay_1.default />} onClick={onRetry} aria-label="Retry loading table">
          Retry
        </material_1.Button>)}
    </material_1.Box>);
    return (<material_1.Paper variant="outlined" sx={{ p: 2 }}>
      {(title || subtitle) && (<material_1.Stack spacing={0.5} mb={2}>
          {title && (<material_1.Typography variant="h6" component="h2">
              {title}
            </material_1.Typography>)}
          {subtitle && (<material_1.Typography variant="body2" color="text.secondary">
              {subtitle}
            </material_1.Typography>)}
        </material_1.Stack>)}
      <div style={{ width: '100%' }}>
        <x_data_grid_1.DataGrid disableColumnFilter checkboxSelection={checkboxSelection} density={isMobile ? 'compact' : 'standard'} slots={{
            toolbar: DataTableToolbar,
            loadingOverlay: material_1.LinearProgress,
            noRowsOverlay: renderEmptyState,
        }} sx={{
            border: `1px solid ${tokens_1.lightTokens.palette.border.default}`,
            '& .MuiDataGrid-row:focus-within': {
                outline: `2px solid ${tokens_1.lightTokens.palette.states.outline}`,
                outlineOffset: 1,
            },
        }} autoHeight rows={rows} columns={columns} pagination pageSizeOptions={[pageSize, 25, 50]} initialState={{
            pagination: { paginationModel: { pageSize } },
        }} loading={loading} onRowSelectionModelChange={(ids) => {
            const normalized = ids;
            setSelectionModel(normalized);
            onSelectionChange?.(normalized);
        }} rowSelectionModel={selectionModel}/>
      </div>
    </material_1.Paper>);
};
exports.DataTable = DataTable;
