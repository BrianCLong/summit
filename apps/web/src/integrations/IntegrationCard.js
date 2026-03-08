"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationCard = void 0;
const react_1 = __importDefault(require("react"));
exports.IntegrationCard = react_1.default.memo(({ type, title, description, onConfigure }) => {
    return (<div className="border p-4 rounded shadow bg-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-gray-600 mb-4">{description}</p>
            <button onClick={() => onConfigure(type)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                Configure
            </button>
        </div>);
});
exports.IntegrationCard.displayName = 'IntegrationCard';
