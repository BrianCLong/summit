"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GraphWorkbench;
const react_1 = __importDefault(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const Box_1 = __importDefault(require("@mui/material/Box"));
const Toolbar_1 = __importDefault(require("./Toolbar"));
const GraphCanvas_1 = __importDefault(require("./GraphCanvas"));
const SidePanel_1 = __importDefault(require("./SidePanel"));
function GraphWorkbench() {
    return (<Box_1.default p={1}>
      <Toolbar_1.default />
      <Grid_1.default container spacing={1}>
        <Grid_1.default item xs={12} md={9}>
          <GraphCanvas_1.default />
        </Grid_1.default>
        <Grid_1.default item xs={12} md={3}>
          <SidePanel_1.default />
        </Grid_1.default>
      </Grid_1.default>
    </Box_1.default>);
}
