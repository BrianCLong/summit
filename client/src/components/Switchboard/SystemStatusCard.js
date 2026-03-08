"use strict";
// @ts-nocheck - React 18/19 type compatibility
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SystemStatusCard;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const framer_motion_1 = require("framer-motion");
const react_router_dom_1 = require("react-router-dom");
function SystemStatusCard({ status }) {
    return (<framer_motion_1.motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <material_1.Card className="rounded-2xl">
        <material_1.CardHeader title={<material_1.Typography variant="h6" className="flex items-center gap-2">
              <icons_material_1.ShowChart className="h-4 w-4"/>
              {status.title}
            </material_1.Typography>}/>
        <material_1.CardContent>
          <material_1.Typography variant="h4" className="font-bold">
            {status.metric}
          </material_1.Typography>
          <material_1.Typography variant="body2" className="opacity-70">
            {status.desc}
          </material_1.Typography>
          <material_1.Box className="flex gap-2 mt-4">
            {status.docsLink && (<material_1.Button component={react_router_dom_1.Link} to={status.docsLink} variant="outlined" size="small">
                Docs
              </material_1.Button>)}
            {status.logsLink && (<material_1.Button component={react_router_dom_1.Link} to={status.logsLink} variant="outlined" size="small">
                Logs
              </material_1.Button>)}
            {status.actions?.map((action) => (<material_1.Button key={action.id} variant="contained" size="small">
                {action.label}
              </material_1.Button>))}
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>
    </framer_motion_1.motion.div>);
}
