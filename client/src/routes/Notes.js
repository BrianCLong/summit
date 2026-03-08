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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Notes;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
function Notes() {
    const [title, setTitle] = (0, react_1.useState)('');
    const [body, setBody] = (0, react_1.useState)('');
    const [tag, setTag] = (0, react_1.useState)('');
    const handleSave = () => {
        if (!title.trim())
            return;
        setBody('');
        setTitle('');
        setTag('');
    };
    return (<material_1.Box sx={{ maxWidth: 720, mx: 'auto', py: 2 }}>
      <material_1.Typography variant="h4" gutterBottom>
        Notes
      </material_1.Typography>
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Stack spacing={2}>
            <material_1.TextField label="Title" value={title} autoFocus onChange={(event) => setTitle(event.target.value)} inputProps={{ 'aria-label': 'Note title' }}/>
            <material_1.TextField label="Tags" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="workspace, briefing, next-steps"/>
            <material_1.TextField label="Body" value={body} onChange={(event) => setBody(event.target.value)} multiline minRows={6} placeholder="Capture your note with context, links, and follow-ups."/>
            <material_1.Button variant="contained" onClick={handleSave}>
              Save note
            </material_1.Button>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
}
