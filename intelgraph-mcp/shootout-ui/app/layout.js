"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: 'IntelGraph MCP Shootout',
    description: 'Benchmark scoreboard for IntelGraph Maestro Conductor vs competitors.',
};
function RootLayout({ children }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
