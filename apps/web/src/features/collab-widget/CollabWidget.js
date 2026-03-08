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
exports.CollabWidget = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const dompurify_1 = __importDefault(require("dompurify"));
const jquery_1 = __importDefault(require("jquery"));
const CollabWidget = ({ entityId, client }) => {
    const [comments, setComments] = (0, react_1.useState)([]);
    const [text, setText] = (0, react_1.useState)('');
    const listRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const cy = window.cy;
        if (cy) {
            (0, jquery_1.default)(cy).on('select', 'node', (e) => {
                client.updateSelection(e.target.id(), true);
            });
        }
        const handleAdd = (msg) => {
            setComments(prev => [
                ...prev,
                { commentId: msg.commentId, text: msg.text, userId: msg.userId },
            ]);
        };
        client.on('comment.add', handleAdd);
        return () => {
            client.off('comment.add', handleAdd);
        };
    }, [client]);
    const add = () => {
        if (text.trim()) {
            client.addComment(entityId, text);
            setText('');
        }
    };
    const onKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.currentTarget.nextElementSibling?.focus();
        }
        if (e.key === 'ArrowUp') {
            e.currentTarget.previousElementSibling?.focus();
        }
    };
    return (<material_1.Box sx={{ width: 300 }}>
      <material_1.Typography variant="h6">Comments</material_1.Typography>
      <material_1.List ref={listRef}>
        {comments.map(c => (<material_1.ListItem key={c.commentId} tabIndex={0} onKeyDown={onKey}>
            <span dangerouslySetInnerHTML={{ __html: dompurify_1.default.sanitize(c.text) }}/>
          </material_1.ListItem>))}
      </material_1.List>
      <material_1.TextField value={text} onChange={e => setText(e.target.value)} onKeyDown={() => client.typing(entityId)}/>
      <material_1.Button onClick={add}>Add</material_1.Button>
    </material_1.Box>);
};
exports.CollabWidget = CollabWidget;
exports.default = exports.CollabWidget;
