"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RunbookPlanner;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const jquery_1 = __importDefault(require("jquery"));
function RunbookPlanner() {
    const [task, setTask] = (0, react_1.useState)('qa');
    const [loa, setLoa] = (0, react_1.useState)(1);
    const [stream, setStream] = (0, react_1.useState)(true);
    const [input, setInput] = (0, react_1.useState)('say hello');
    function execute() {
        jquery_1.default.ajax({
            url: '/route/execute',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ task, loa, input, stream }),
            success: (resp) => console.log('audit_id', resp.audit_id),
            error: (xhr) => console.error(xhr.responseText),
        });
    }
    return (<material_1.Stack spacing={2} direction="row" alignItems="center">
      <material_1.TextField size="small" label="Task" value={task} onChange={(e) => setTask(e.target.value)}/>
      <material_1.TextField size="small" label="LoA" type="number" value={loa} onChange={(e) => setLoa(Number(e.target.value))}/>
      <material_1.TextField size="small" label="Input" value={input} onChange={(e) => setInput(e.target.value)} style={{ minWidth: 280 }}/>
      <material_1.FormControlLabel control={<material_1.Switch checked={stream} onChange={(e) => setStream(e.target.checked)}/>} label="Stream"/>
      <material_1.Button variant="contained" onClick={execute}>
        Plan & Execute
      </material_1.Button>
    </material_1.Stack>);
}
