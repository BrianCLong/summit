"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: 'CompanyOS Switchboard',
    description: 'Local-first command center',
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
