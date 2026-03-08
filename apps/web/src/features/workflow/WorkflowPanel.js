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
exports.default = WorkflowPanel;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const Button_1 = __importDefault(require("@mui/material/Button"));
const Checkbox_1 = __importDefault(require("@mui/material/Checkbox"));
const List_1 = __importDefault(require("@mui/material/List"));
const ListItem_1 = __importDefault(require("@mui/material/ListItem"));
const ListItemText_1 = __importDefault(require("@mui/material/ListItemText"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
const jquery_1 = __importDefault(require("jquery"));
function WorkflowPanel() {
    const [caseId, setCaseId] = (0, react_1.useState)(null);
    const [info, setInfo] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const handler = (_e, node) => setCaseId(node.id());
        (0, jquery_1.default)(document).on('cy:selected', handler);
        return () => (0, jquery_1.default)(document).off('cy:selected', handler);
    }, []);
    (0, react_1.useEffect)(() => {
        let timer;
        if (caseId) {
            const fetchInfo = async () => {
                const res = await fetch(`/wf/cases/${caseId}`);
                const data = await res.json();
                setInfo(data);
            };
            void fetchInfo();
            timer = setInterval(fetchInfo, 1000);
        }
        return () => clearInterval(timer);
    }, [caseId]);
    if (!info) {
        return <Typography_1.default tabIndex={0}>Select a case</Typography_1.default>;
    }
    return (<div aria-label="workflow panel">
      <Typography_1.default tabIndex={0}>State: {info.state}</Typography_1.default>
      <Typography_1.default tabIndex={0}>SLA remaining: {info.slaRemaining}</Typography_1.default>
      <List_1.default aria-label="checklist">
        {info.checklist.map((item, idx) => (<ListItem_1.default key={idx} disablePadding>
            <Checkbox_1.default tabIndex={0} inputProps={{ 'aria-label': item.text }}/>
            <ListItemText_1.default primary={item.text}/>
          </ListItem_1.default>))}
      </List_1.default>
      <Button_1.default variant="contained" tabIndex={0} aria-label="refresh" onClick={() => {
            if (caseId) {
                void fetch(`/wf/cases/${caseId}`)
                    .then((r) => r.json())
                    .then(setInfo);
            }
        }}>
        Refresh
      </Button_1.default>
    </div>);
}
