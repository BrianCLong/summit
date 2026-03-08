"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AERBadge = AERBadge;
const react_1 = __importDefault(require("react"));
function AERBadge({ aer }) {
    const status = aer ? 'AER?' : 'No AER';
    return (<span className="px-2 py-1 rounded-2xl text-xs bg-gray-100" data-aer={encodeURIComponent(JSON.stringify(aer || {}))}>
      {status}
    </span>);
}
