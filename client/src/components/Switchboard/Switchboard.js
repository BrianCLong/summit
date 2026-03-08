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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Switchboard;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AgentCard_1 = __importDefault(require("./AgentCard"));
const SystemStatusCard_1 = __importDefault(require("./SystemStatusCard"));
const ActionsPanel_1 = __importDefault(require("./ActionsPanel"));
const CommandPalette_1 = __importDefault(require("./CommandPalette"));
const mockData_1 = require("./mockData");
function Switchboard() {
    const [openChat, setOpenChat] = (0, react_1.useState)(false);
    const [cmdOpen, setCmdOpen] = (0, react_1.useState)(false);
    const [meeting, setMeeting] = (0, react_1.useState)(false);
    const handleCommandSelect = (command) => {
        if (command.includes('meeting')) {
            setMeeting(true);
        }
        else if (command.includes('Scribe')) {
            setOpenChat(true);
        }
        setCmdOpen(false);
    };
    return (<material_1.Box className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <material_1.Box component="aside" className="col-span-3 space-y-3">
        <AgentCard_1.default agents={mockData_1.agents} onChat={() => setOpenChat(true)}/>
        <ActionsPanel_1.default onOpenCommandPalette={() => setCmdOpen(true)}/>
      </material_1.Box>

      {/* Center tiles */}
      <material_1.Box component="main" className="col-span-6 space-y-3">
        <material_1.Box className="grid grid-cols-2 gap-3">
          {mockData_1.systemStatus.map((s) => (<SystemStatusCard_1.default key={s.id} status={s}/>))}
        </material_1.Box>
        <material_1.Card className="rounded-2xl">
          <material_1.CardHeader title={<material_1.Typography variant="h6">Meeting Stage</material_1.Typography>}/>
          <material_1.CardContent>
            {meeting ? (<material_1.Box className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center">
                <material_1.Typography variant="h6">Live WebRTC Stage</material_1.Typography>
              </material_1.Box>) : (<material_1.Button variant="contained" onClick={() => setMeeting(true)}>
                Start Local Meeting
              </material_1.Button>)}
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Box>

      {/* Right rail: Co‑pilot */}
      <material_1.Box component="aside" className="col-span-3 space-y-3">
        <material_1.Card className="rounded-2xl">
          <material_1.CardHeader title={<material_1.Typography variant="h6" className="flex items-center gap-2">
                <icons_material_1.Lightbulb className="h-4 w-4"/>
                Co‑pilot
              </material_1.Typography>}/>
          <material_1.CardContent className="space-y-3">
            <material_1.Box className="flex gap-2">
              <material_1.Button variant="outlined" startIcon={<icons_material_1.Mic />}>
                Listen
              </material_1.Button>
              <material_1.Button variant="outlined">Present</material_1.Button>
            </material_1.Box>
            <material_1.Typography variant="caption" className="opacity-70">
              Context loaded: org, agenda, metrics. Actions will be
              policy‑checked.
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Box>

      {/* Chat dialog */}
      <material_1.Dialog open={openChat} onClose={() => setOpenChat(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Chat with Agent</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Box className="rounded-xl border p-3 min-h-32 bg-gray-50 dark:bg-gray-900">
            <material_1.Typography> (messages…) </material_1.Typography>
          </material_1.Box>
        </material_1.DialogContent>
      </material_1.Dialog>

      {/* Command Palette */}
      <CommandPalette_1.default open={cmdOpen} onClose={() => setCmdOpen(false)} onCommandSelect={handleCommandSelect}/>
    </material_1.Box>);
}
