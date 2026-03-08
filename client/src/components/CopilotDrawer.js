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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Chat_1 = __importDefault(require("@mui/icons-material/Chat"));
const socket_io_client_1 = require("socket.io-client");
/**
 * CopilotDrawer provides a lightweight chat interface that
 * streams messages from an AI endpoint via Socket.IO.
 */
const CopilotDrawer = () => {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [input, setInput] = (0, react_1.useState)('');
    const socketRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const socketInstance = (0, socket_io_client_1.io)('/copilot');
        socketRef.current = socketInstance;
        socketInstance.on('copilot:response', (text) => {
            setMessages((m) => [...m, { from: 'ai', text }]);
        });
        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
        };
    }, []);
    const send = () => {
        if (!input.trim())
            return;
        setMessages((m) => [...m, { from: 'user', text: input }]);
        socketRef.current?.emit('copilot:question', input);
        setInput('');
    };
    return (<>
      <material_1.IconButton aria-label="open copilot" onClick={() => setOpen(true)} sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <Chat_1.default />
      </material_1.IconButton>
      <material_1.Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <material_1.Box sx={{ width: 320, p: 2 }}>
          <material_1.Typography variant="h6" gutterBottom>
            Copilot
          </material_1.Typography>
          <material_1.List sx={{ height: 360, overflowY: 'auto' }}>
            {messages.map((m, idx) => (<material_1.ListItem key={idx}>
                <material_1.ListItemText primary={m.text} secondary={m.from === 'ai' ? 'AI' : 'You'}/>
              </material_1.ListItem>))}
          </material_1.List>
          <material_1.Box sx={{ display: 'flex', gap: 1 }}>
            <material_1.TextField value={input} onChange={(e) => setInput(e.target.value)} fullWidth size="small" placeholder="Ask a question"/>
            <material_1.Button onClick={send} variant="contained">
              Send
            </material_1.Button>
          </material_1.Box>
        </material_1.Box>
      </material_1.Drawer>
    </>);
};
exports.default = CopilotDrawer;
