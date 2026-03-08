"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherWidget = WeatherWidget;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function WeatherWidget({ className = '' }) {
    return (<div className={`p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">Current Weather</p>
          <p className="text-2xl font-bold">--°</p>
        </div>
        <span className="text-4xl">🌤️</span>
      </div>
    </div>);
}
