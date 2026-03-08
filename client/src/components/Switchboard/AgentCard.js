"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentCard;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function AgentCard({ agents, onChat }) {
    return (<material_1.Card className="rounded-2xl">
      <material_1.CardHeader title={<material_1.Typography variant="h6" className="flex items-center gap-2">
            <icons_material_1.Group className="h-4 w-4"/>
            Agents
          </material_1.Typography>}/>
      <material_1.CardContent className="space-y-2">
        {agents.map((a) => (<material_1.Box key={a.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
            <material_1.Box>
              <material_1.Typography variant="subtitle1" className="font-medium">
                {a.name}
              </material_1.Typography>
              <material_1.Typography variant="caption" className="text-xs opacity-70">
                {a.tags.join(' • ')}
              </material_1.Typography>
            </material_1.Box>
            <material_1.Box className="flex gap-2">
              <material_1.Button size="small" variant="outlined" onClick={onChat} startIcon={<icons_material_1.Message />}>
                Chat
              </material_1.Button>
              <material_1.Button size="small" variant="outlined" startIcon={<icons_material_1.Phone />}>
                Call
              </material_1.Button>
              <material_1.Button size="small" variant="outlined" startIcon={<icons_material_1.Videocam />}>
                Video
              </material_1.Button>
            </material_1.Box>
          </material_1.Box>))}
      </material_1.CardContent>
    </material_1.Card>);
}
