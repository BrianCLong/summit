"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.theme = void 0;
const styles_1 = require("@mui/material/styles");
exports.theme = (0, styles_1.createTheme)({
    palette: { mode: 'dark' },
    shape: { borderRadius: 16 },
    components: {
        MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
        MuiButton: {
            styleOverrides: { root: { textTransform: 'none', borderRadius: 9999 } },
        },
    },
});
