// @ts-nocheck
import React from "react";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import ReplayIcon from "@mui/icons-material/Replay";
import { useDesignSystemTelemetry } from "../DesignSystemProvider";
import { lightTokens } from "../tokens";

export type DataTableProps = {
  rows: object[];
  columns: GridColDef[];
  loading?: boolean;
  pageSize?: number;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: (string | number)[]) => void;
  onRetry?: () => void;
  emptyState?: { title?: string; description?: string };
  title?: string;
  subtitle?: string;
};

const DataTableToolbar: React.FC = () => (
  <GridToolbarContainer>
    <GridToolbarQuickFilter debounceMs={200} placeholder="Filter by keyword" />
  </GridToolbarContainer>
);

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  columns,
  loading = false,
  pageSize = 10,
  checkboxSelection = true,
  onSelectionChange,
  onRetry,
  emptyState,
  title,
  subtitle,
}) => {
  const telemetry = useDesignSystemTelemetry();
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [selectionModel, setSelectionModel] = React.useState<(string | number)[]>([]);

  React.useEffect(() => {
    telemetry.record("DataTable", "1.0.0", {
      columns: columns.map((c) => c.field),
      hasBulk: checkboxSelection,
    });
  }, [columns, checkboxSelection, telemetry]);

  React.useEffect(() => {
    const spacingValue = theme.spacing ? theme.spacing(1) : lightTokens.spacing.sm;
    const normalized =
      typeof spacingValue === "string" ? Number(spacingValue.replace("px", "")) : spacingValue;
    telemetry.validateStyle("DataTable", "1.0.0", { padding: normalized });
  }, [theme, telemetry]);

  const renderEmptyState = () => (
    <Box textAlign="center" p={4} role="status">
      <Typography variant="h6" gutterBottom>
        {emptyState?.title || "No results found"}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {emptyState?.description || "Try adjusting filters or refreshing the data source."}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={onRetry}
          aria-label="Retry loading table"
        >
          Retry
        </Button>
      )}
    </Box>
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {(title || subtitle) && (
        <Stack spacing={0.5} mb={2}>
          {title && (
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
      )}
      <div style={{ width: "100%" }}>
        <DataGrid
          disableColumnFilter
          checkboxSelection={checkboxSelection}
          density={isMobile ? "compact" : "standard"}
          slots={{
            toolbar: DataTableToolbar,
            loadingOverlay: LinearProgress,
            noRowsOverlay: renderEmptyState,
          }}
          sx={{
            border: `1px solid ${lightTokens.palette.border.default}`,
            "& .MuiDataGrid-row:focus-within": {
              outline: `2px solid ${lightTokens.palette.states.outline}`,
              outlineOffset: 1,
            },
          }}
          autoHeight
          rows={rows}
          columns={columns}
          pagination
          pageSizeOptions={[pageSize, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize } },
          }}
          loading={loading}
          onRowSelectionModelChange={(ids) => {
            const normalized = ids as (string | number)[];
            setSelectionModel(normalized);
            onSelectionChange?.(normalized);
          }}
          rowSelectionModel={selectionModel}
        />
      </div>
    </Paper>
  );
};
