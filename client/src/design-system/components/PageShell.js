"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageShell = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const NavigateNext_1 = __importDefault(require("@mui/icons-material/NavigateNext"));
const HomeOutlined_1 = __importDefault(require("@mui/icons-material/HomeOutlined"));
const DesignSystemProvider_1 = require("../DesignSystemProvider");
const PageShell = ({ title, subtitle, breadcrumbs, primaryAction, secondaryAction, permission, children, }) => {
    const telemetry = (0, DesignSystemProvider_1.useDesignSystemTelemetry)();
    const isAllowed = permission?.allowed ?? true;
    const reason = permission?.reason;
    react_1.default.useEffect(() => {
        telemetry.record('PageShell', '1.0.0', { title, allowed: isAllowed });
    }, [telemetry, title, isAllowed]);
    return (<material_1.Box component="section" sx={{ p: 3, gap: 2, display: 'flex', flexDirection: 'column' }}>
      <material_1.Box>
        {breadcrumbs && breadcrumbs.length > 0 && (<material_1.Breadcrumbs aria-label="breadcrumb" separator={<NavigateNext_1.default fontSize="small"/>}>
            <material_1.Button variant="text" size="small" startIcon={<HomeOutlined_1.default fontSize="small"/>} onClick={breadcrumbs[0]?.onClick}>
              Home
            </material_1.Button>
            {breadcrumbs.map((crumb) => (<material_1.Button key={crumb.label} variant="text" size="small" onClick={crumb.onClick} href={crumb.href}>
                {crumb.label}
              </material_1.Button>))}
          </material_1.Breadcrumbs>)}
        <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" mt={breadcrumbs ? 2 : 0}>
          <material_1.Box>
            <material_1.Typography variant="h4" component="h1" gutterBottom>
              {title}
            </material_1.Typography>
            {subtitle && (<material_1.Typography variant="body1" color="text.secondary">
                {subtitle}
              </material_1.Typography>)}
          </material_1.Box>
          <material_1.Stack direction="row" spacing={1}>
            {secondaryAction}
            {primaryAction}
          </material_1.Stack>
        </material_1.Stack>
      </material_1.Box>
      {!isAllowed && (<material_1.Alert severity="warning" role="status" aria-live="polite">
          <material_1.Typography variant="body1" fontWeight={600} gutterBottom>
            You don’t have access to this area.
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            {reason || 'Contact your administrator to request permission.'}
          </material_1.Typography>
        </material_1.Alert>)}
      <material_1.Box aria-busy={!isAllowed ? undefined : false} aria-live="polite">
        {children}
      </material_1.Box>
    </material_1.Box>);
};
exports.PageShell = PageShell;
