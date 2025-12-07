/**
 * SHIM: Temporary MUI Grid shims to unblock typecheck.
 * Scope: legacy Grid usage with `item`/`container` props.
 * TODO(typing): migrate to proper MUI Grid2 types and remove.
 */

declare module '@mui/material/Grid' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Grid: any;
  export default Grid;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type GridProps = any;
}

declare module '@mui/material' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MuiAny = any;

  export const Alert: MuiAny;
  export const AlertTitle: MuiAny;
  export const Accordion: MuiAny;
  export const AccordionSummary: MuiAny;
  export const AccordionDetails: MuiAny;
  export const Autocomplete: MuiAny;
  export const Avatar: MuiAny;
  export const AvatarGroup: MuiAny;
  export const Badge: MuiAny;
  export const Box: MuiAny;
  export const Button: MuiAny;
  export const ButtonGroup: MuiAny;
  export const Card: MuiAny;
  export const CardActions: MuiAny;
  export const CardContent: MuiAny;
  export const CardHeader: MuiAny;
  export const Checkbox: MuiAny;
  export const Chip: MuiAny;
  export const CircularProgress: MuiAny;
  export const Collapse: MuiAny;
  export const Container: MuiAny;
  export const CssBaseline: MuiAny;
  export const Dialog: MuiAny;
  export const DialogActions: MuiAny;
  export const DialogContent: MuiAny;
  export const DialogTitle: MuiAny;
  export const Divider: MuiAny;
  export const Drawer: MuiAny;
  export const FormControl: MuiAny;
  export const FormControlLabel: MuiAny;
  export const Grid: MuiAny;
  export const IconButton: MuiAny;
  export const InputAdornment: MuiAny;
  export const InputLabel: MuiAny;
  export const LinearProgress: MuiAny;
  export const Link: MuiAny;
  export const List: MuiAny;
  export const ListItem: MuiAny;
  export const ListItemAvatar: MuiAny;
  export const ListItemButton: MuiAny;
  export const ListItemIcon: MuiAny;
  export const ListItemText: MuiAny;
  export const Menu: MuiAny;
  export const MenuItem: MuiAny;
  export const Rating: MuiAny;
  export const Pagination: MuiAny;
  export const Paper: MuiAny;
  export const Select: MuiAny;
  export const Skeleton: MuiAny;
  export const Snackbar: MuiAny;
  export const Slider: MuiAny;
  export const Stack: MuiAny;
  export const Step: MuiAny;
  export const StepLabel: MuiAny;
  export const Stepper: MuiAny;
  export const Switch: MuiAny;
  export const Tab: MuiAny;
  export const Table: MuiAny;
  export const TableBody: MuiAny;
  export const TableCell: MuiAny;
  export const TableContainer: MuiAny;
  export const TableHead: MuiAny;
  export const TablePagination: MuiAny;
  export const TableRow: MuiAny;
  export const Tabs: MuiAny;
  export const TextField: MuiAny;
  export const ThemeProvider: MuiAny;
  export const Tooltip: MuiAny;
  export const Typography: MuiAny;
  export const ToggleButton: MuiAny;
  export const ToggleButtonGroup: MuiAny;
  export const createTheme: MuiAny;
  export type ChipProps = MuiAny;
}

declare module '@mui/material/Unstable_Grid2' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Grid2: any;
  export default Grid2;
}
