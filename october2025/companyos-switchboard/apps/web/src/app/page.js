"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const Switchboard_1 = __importDefault(require("@/components/Switchboard"));
function Home() {
    return (<div className="p-6">
      <Switchboard_1.default />
    </div>);
}
