"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const react_1 = __importDefault(require("react"));
function PageHeader({ title, description, className = '', }) {
    return (<header className={className}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
      {description ? (<p className="mt-1 text-sm text-muted-foreground">{description}</p>) : null}
    </header>);
}
