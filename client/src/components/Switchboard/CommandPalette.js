"use strict";
'use client';
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandPalette;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function CommandPalette({ open, onClose, onCommandSelect }) {
    const [commandInput, setCommandInput] = (0, react_1.useState)('');
    const commands = [
        'Start meeting',
        'Message Scribe',
        'Open Graph View',
        '/call maestro',
        '/present deck',
        '/join room',
        '/status api',
    ];
    const filteredCommands = commands.filter((cmd) => cmd.toLowerCase().includes(commandInput.toLowerCase()));
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <material_1.DialogContent className="p-0">
        <material_1.TextField fullWidth placeholder="/call maestro | /present deck | /join room | /status api" value={commandInput} onChange={(e) => setCommandInput(e.target.value)} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                <icons_material_1.Search />
              </material_1.InputAdornment>),
        }} className="p-4"/>
        <material_1.List>
          {filteredCommands.map((cmd, index) => (<material_1.ListItemButton key={index} onClick={() => onCommandSelect(cmd)}>
              <material_1.Typography>{cmd}</material_1.Typography>
            </material_1.ListItemButton>))}
        </material_1.List>
      </material_1.DialogContent>
    </material_1.Dialog>);
}
