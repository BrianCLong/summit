"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsLayout = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const Unstable_Grid2_1 = __importDefault(require("@mui/material/Unstable_Grid2"));
const PageShell_1 = require("./PageShell");
const DesignSystemProvider_1 = require("../DesignSystemProvider");
const SettingsLayout = ({ sections, ...pageProps }) => {
    const telemetry = (0, DesignSystemProvider_1.useDesignSystemTelemetry)();
    react_1.default.useEffect(() => {
        telemetry.record('SettingsLayout', '1.0.0', { sections: sections.map((s) => s.title) });
    }, [sections, telemetry]);
    return (<PageShell_1.PageShell {...pageProps}>
      <material_1.Stack spacing={2}>
        {sections.map((section) => (<material_1.Paper key={section.title} variant="outlined" sx={{ p: 3 }}>
            <Unstable_Grid2_1.default container spacing={2} columns={12} alignItems="flex-start">
              <Unstable_Grid2_1.default xs={12} md={4}>
                <material_1.Typography variant="h6" component="h2">
                  {section.title}
                </material_1.Typography>
                {section.description && (<material_1.Typography variant="body2" color="text.secondary" mt={1}>
                    {section.description}
                  </material_1.Typography>)}
              </Unstable_Grid2_1.default>
              <Unstable_Grid2_1.default xs={12} md={8}>
                <material_1.Divider sx={{ mb: 2, display: { md: 'none' } }}/>
                <material_1.Box>{section.content}</material_1.Box>
              </Unstable_Grid2_1.default>
            </Unstable_Grid2_1.default>
          </material_1.Paper>))}
      </material_1.Stack>
    </PageShell_1.PageShell>);
};
exports.SettingsLayout = SettingsLayout;
