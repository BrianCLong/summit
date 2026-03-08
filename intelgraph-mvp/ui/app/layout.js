"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
const react_1 = __importDefault(require("react"));
require("./globals.css");
function RootLayout({ children, }) {
    return (<html lang="en">
      <body className="p-4 bg-gray-50 text-gray-900 h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>);
}
