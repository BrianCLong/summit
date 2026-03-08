"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: 'Retentiond Dashboard',
    description: 'Visibility into upcoming expirations and deletion KPIs'
};
function RootLayout({ children }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
