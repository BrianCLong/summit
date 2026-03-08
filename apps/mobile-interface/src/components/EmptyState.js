"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function EmptyState({ title = 'No results', description = 'No items found.', icon, action, className = '', }) {
    return (<div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      {action && (<button onClick={action.onClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {action.label}
        </button>)}
    </div>);
}
