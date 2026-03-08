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
exports.OPAPlaygroundPage = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_monaco_editor_1 = __importDefault(require("react-monaco-editor"));
const react_json_view_1 = __importDefault(require("react-json-view"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const select_1 = require("@/components/ui/select");
const sonner_1 = require("sonner");
const OPAPlaygroundPage = () => {
    const [policies, setPolicies] = (0, react_1.useState)([]);
    const [selectedPolicy, setSelectedPolicy] = (0, react_1.useState)('');
    const [policyContent, setPolicyContent] = (0, react_1.useState)('package play\n\ndefault allow = false\n\nallow {\n  input.user == "admin"\n}');
    const [inputContent, setInputContent] = (0, react_1.useState)('{\n  "user": "admin"\n}');
    const [output, setOutput] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchPolicies();
    }, []);
    const fetchPolicies = async () => {
        try {
            const res = await fetch('/api/opa/policies', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPolicies(data.policies || []);
            }
        }
        catch (e) {
            console.error(e);
            sonner_1.toast.error('Failed to load policies');
        }
    };
    const loadPolicy = async (filename) => {
        if (!filename)
            return;
        try {
            setLoading(true);
            const res = await fetch(`/api/opa/policies/${filename}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPolicyContent(data.content);
                setSelectedPolicy(filename);
            }
            else {
                sonner_1.toast.error('Failed to load policy content');
            }
        }
        catch (e) {
            console.error(e);
            sonner_1.toast.error('Error loading policy');
        }
        finally {
            setLoading(false);
        }
    };
    const runEvaluation = async () => {
        try {
            setLoading(true);
            let parsedInput = {};
            try {
                parsedInput = JSON.parse(inputContent);
            }
            catch (e) {
                sonner_1.toast.error('Invalid JSON input');
                setLoading(false);
                return;
            }
            const res = await fetch('/api/opa/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    policy: policyContent,
                    input: parsedInput
                })
            });
            const data = await res.json();
            if (res.ok) {
                setOutput(data);
                sonner_1.toast.success('Evaluation complete');
            }
            else {
                setOutput(data); // Show error in output
                sonner_1.toast.error('Evaluation failed');
            }
        }
        catch (e) {
            console.error(e);
            sonner_1.toast.error('Network error');
        }
        finally {
            setLoading(false);
        }
    };
    const validatePolicy = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/opa/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ policy: policyContent })
            });
            const data = await res.json();
            if (data.valid) {
                sonner_1.toast.success('Policy is valid');
            }
            else {
                sonner_1.toast.error('Validation failed');
                setOutput({ error: data.error });
            }
        }
        catch (e) {
            console.error(e);
            sonner_1.toast.error('Validation error');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="p-6 h-[calc(100vh-64px)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">OPA Policy Playground</h1>
        <div className="flex gap-2">
          <select_1.Select value={selectedPolicy} onValueChange={loadPolicy}>
            <select_1.SelectTrigger className="w-[200px]">
              <select_1.SelectValue placeholder="Load Policy"/>
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {policies.map(p => (<select_1.SelectItem key={p} value={p}>{p}</select_1.SelectItem>))}
            </select_1.SelectContent>
          </select_1.Select>
          <Button_1.Button onClick={validatePolicy} variant="secondary" disabled={loading}>Validate</Button_1.Button>
          <Button_1.Button onClick={runEvaluation} disabled={loading}>Evaluate</Button_1.Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-4">
            <Card_1.Card className="flex-1 flex flex-col min-h-0">
                <Card_1.CardHeader className="py-2"><Card_1.CardTitle className="text-sm">Policy (Rego)</Card_1.CardTitle></Card_1.CardHeader>
                <Card_1.CardContent className="flex-1 p-0 min-h-0 relative">
                    <div className="absolute inset-0">
                        <react_monaco_editor_1.default language="ruby" // Monaco doesn't have built-in Rego, Ruby or Python is closest syntax highlighting
     theme="vs-dark" value={policyContent} options={{ minimap: { enabled: false }, automaticLayout: true }} onChange={setPolicyContent}/>
                    </div>
                </Card_1.CardContent>
            </Card_1.Card>
        </div>

        <div className="flex flex-col gap-4">
            <Card_1.Card className="flex-1 flex flex-col min-h-0">
                <Card_1.CardHeader className="py-2"><Card_1.CardTitle className="text-sm">Input (JSON)</Card_1.CardTitle></Card_1.CardHeader>
                 <Card_1.CardContent className="flex-1 p-0 min-h-0 relative">
                    <div className="absolute inset-0">
                        <react_monaco_editor_1.default language="json" theme="vs-dark" value={inputContent} options={{ minimap: { enabled: false }, automaticLayout: true }} onChange={setInputContent}/>
                    </div>
                </Card_1.CardContent>
            </Card_1.Card>
            <Card_1.Card className="flex-1 flex flex-col min-h-0">
                <Card_1.CardHeader className="py-2"><Card_1.CardTitle className="text-sm">Output</Card_1.CardTitle></Card_1.CardHeader>
                <Card_1.CardContent className="flex-1 p-4 overflow-auto bg-slate-950 text-slate-50">
                     <react_json_view_1.default src={output} theme="ocean" displayDataTypes={false} enableClipboard={true} style={{ backgroundColor: 'transparent' }}/>
                </Card_1.CardContent>
            </Card_1.Card>
        </div>
      </div>
    </div>);
};
exports.OPAPlaygroundPage = OPAPlaygroundPage;
