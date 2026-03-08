"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertDescription = exports.Alert = void 0;
const react_1 = __importDefault(require("react"));
const Alert = ({ className = '', children }) => {
    return (<div className={`border-l-4 p-4 mb-4 ${className}`} role="alert">
      {children}
    </div>);
};
exports.Alert = Alert;
const AlertDescription = ({ children, }) => {
    return <div className="text-sm">{children}</div>;
};
exports.AlertDescription = AlertDescription;
