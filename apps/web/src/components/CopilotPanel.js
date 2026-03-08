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
exports.CopilotPanel = CopilotPanel;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const textarea_1 = require("@/components/ui/textarea");
const Badge_1 = require("@/components/ui/Badge");
const label_1 = require("@/components/ui/label");
const use_toast_1 = require("@/hooks/use-toast");
const lucide_react_1 = require("lucide-react");
const Tabs_1 = require("@/components/ui/Tabs");
const Dialog_1 = require("@/components/ui/Dialog");
const QUICK_PROMPTS = [
    "Find all User nodes with email 'admin@example.com'",
    "List organizations created in the last 7 days",
    "Show relationships between User and Organization",
    "Summarize evidence for incident 'INC-123'",
];
function CopilotPanel() {
    const [prompt, setPrompt] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)(null);
    const [editedCypher, setEditedCypher] = (0, react_1.useState)('');
    const [sandboxResult, setSandboxResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [activeTab, setActiveTab] = (0, react_1.useState)('prompt');
    const { toast } = (0, use_toast_1.useToast)();
    const textareaRef = (0, react_1.useRef)(null);
    // jQuery ref for the action panel
    const actionPanelRef = (0, react_1.useRef)(null);
    // jQuery effect for Action Panel buttons
    (0, react_1.useEffect)(() => {
        if (actionPanelRef.current) {
            const $panel = (0, jquery_1.default)(actionPanelRef.current);
            $panel.find('.action-btn').hover(function () { (0, jquery_1.default)(this).stop().animate({ opacity: 0.8 }, 100); }, function () { (0, jquery_1.default)(this).stop().animate({ opacity: 1 }, 100); });
        }
    }, [result]);
    // jQuery effect for Sandbox Results - fixed race condition
    (0, react_1.useEffect)(() => {
        if (activeTab === 'results' && sandboxResult && actionPanelRef.current) {
            // Use a small timeout to ensure DOM render cycle is complete
            setTimeout(() => {
                (0, jquery_1.default)(actionPanelRef.current).find('.result-area').hide().fadeIn(500);
            }, 50);
        }
    }, [activeTab, sandboxResult]);
    const handleTranslate = async () => {
        if (!prompt.trim())
            return;
        setLoading(true);
        setResult(null);
        setSandboxResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/nl2cypher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt, validate: true }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Translation failed');
            setResult(data);
            setEditedCypher(data.cypher);
            setActiveTab('preview');
            toast({
                title: "Translation Complete",
                description: `Cost Estimate: ${data.estimatedCost} units`,
            });
        }
        catch (err) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleSandboxRun = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/sandbox/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cypher: editedCypher }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Execution failed');
            setSandboxResult(data.rows);
            setActiveTab('results');
            // Animation handled by useEffect now
        }
        catch (err) {
            toast({
                title: "Execution Error",
                description: err.message,
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleRollback = () => {
        if (result) {
            setEditedCypher(result.cypher);
            toast({ title: "Rolled back to generated Cypher" });
        }
    };
    return (<div className="h-full flex flex-col gap-4 p-4">
      <Card_1.Card className="flex-1 flex flex-col">
        <Card_1.CardHeader className="pb-2">
          <Card_1.CardTitle className="flex justify-between items-center">
            <span>Copilot v0.9</span>
            {result?.isValid === false && (<Badge_1.Badge variant="destructive">
                <lucide_react_1.AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true"/> Invalid Syntax
              </Badge_1.Badge>)}
            {result?.isValid === true && (<Badge_1.Badge variant="outline" className="text-green-600 border-green-600">
                <lucide_react_1.CheckCircle className="w-3 h-3 mr-1" aria-hidden="true"/> Valid
              </Badge_1.Badge>)}
          </Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent className="flex-1 flex flex-col gap-4">
          <Tabs_1.Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <Tabs_1.TabsList>
              <Tabs_1.TabsTrigger value="prompt">Prompt</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="preview" disabled={!result}>Preview</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="results" disabled={!sandboxResult}>Results</Tabs_1.TabsTrigger>
              {result?.citations && result.citations.length > 0 && (<Tabs_1.TabsTrigger value="citations">Evidence</Tabs_1.TabsTrigger>)}
            </Tabs_1.TabsList>

            <Tabs_1.TabsContent value="prompt" className="flex-1 flex flex-col gap-4 pt-4">
              <div className="grid w-full gap-1.5 flex-1">
                <label_1.Label htmlFor="copilot-prompt">Prompt</label_1.Label>
                <textarea_1.Textarea ref={textareaRef} id="copilot-prompt" placeholder="Ask a question about the graph (e.g., 'find User where email is ...')" value={prompt} onChange={e => setPrompt(e.target.value)} className="flex-1 resize-none"/>

                {!prompt && (<div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Try:
                    </span>
                    {QUICK_PROMPTS.map(p => (<button key={p} type="button" onClick={() => {
                    setPrompt(p);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                }} aria-label={`Use prompt: ${p}`} className="rounded-full border border-input bg-background px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {p}
                      </button>))}
                  </div>)}
              </div>
              <Button_1.Button onClick={handleTranslate} loading={loading} className="w-full">
                Generate Cypher
              </Button_1.Button>
            </Tabs_1.TabsContent>

            <Tabs_1.TabsContent value="preview" className="flex-1 flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-sm">Generated Cypher</div>
                  <textarea_1.Textarea value={editedCypher} onChange={e => setEditedCypher(e.target.value)} className="flex-1 font-mono text-sm"/>
                  <div className="flex gap-2">
                    <Button_1.Button size="sm" variant="outline" onClick={handleRollback} disabled={editedCypher === result?.cypher} aria-label="Rollback to original Cypher">
                      <lucide_react_1.RotateCcw className="w-4 h-4 mr-1" aria-hidden="true"/> Rollback
                    </Button_1.Button>
                    <Dialog_1.Dialog>
                      <Dialog_1.DialogTrigger asChild>
                         <Button_1.Button size="sm" variant="ghost" aria-label="Show Cypher diff">
                           <lucide_react_1.Code className="w-4 h-4 mr-1" aria-hidden="true"/> Diff
                         </Button_1.Button>
                      </Dialog_1.DialogTrigger>
                      <Dialog_1.DialogContent>
                        <Dialog_1.DialogHeader><Dialog_1.DialogTitle>Diff</Dialog_1.DialogTitle></Dialog_1.DialogHeader>
                        <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                          <div className="bg-muted p-2 rounded">
                            <div className="font-bold mb-1">Original</div>
                            {result?.cypher}
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="font-bold mb-1">Current</div>
                            {editedCypher}
                          </div>
                        </div>
                      </Dialog_1.DialogContent>
                    </Dialog_1.Dialog>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-sm">Rationale</div>
                  <div className="bg-muted p-2 rounded flex-1 overflow-auto text-sm">
                    {result?.rationale.map((r, i) => (<div key={i} className="mb-2">
                        <span className="font-medium text-primary">"{r.phrase}"</span>
                        <br />
                        <span className="font-mono text-xs text-muted-foreground">→ {r.clause}</span>
                      </div>))}
                  </div>
                  {result?.validationError && (<div className="bg-red-50 text-red-600 p-2 rounded text-xs border border-red-200">
                      <lucide_react_1.AlertTriangle className="w-3 h-3 inline mr-1"/>
                      {result.validationError}
                    </div>)}
                </div>
              </div>

              {/* Action Panel - powered by jQuery for interactions */}
              <div ref={actionPanelRef} className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center bg-secondary/20 p-2 rounded">
                  <span className="text-xs font-mono">EST. COST: {result?.estimatedCost}</span>
                  <div className="flex gap-2">
                    <Button_1.Button className="action-btn bg-green-600 hover:bg-green-700 text-white" onClick={handleSandboxRun} loading={loading} disabled={!result?.isValid} aria-label="Run Cypher query in sandbox">
                      {!loading && (<lucide_react_1.Play className="w-4 h-4 mr-1" aria-hidden="true"/>)}
                      Run in Sandbox
                    </Button_1.Button>
                  </div>
                </div>
              </div>
            </Tabs_1.TabsContent>

            <Tabs_1.TabsContent value="results" className="flex-1 pt-4 overflow-auto">
              <div className="result-area">
                 {sandboxResult && sandboxResult.length === 0 && (<div className="text-center text-muted-foreground py-8">No results found.</div>)}
                 {sandboxResult && sandboxResult.length > 0 && (<table className="w-full text-sm border-collapse">
                     <thead>
                       <tr className="border-b">
                         {Object.keys(sandboxResult[0]).map(k => (<th key={k} className="text-left p-2 bg-muted/50">{k}</th>))}
                       </tr>
                     </thead>
                     <tbody>
                       {sandboxResult.map((row, i) => (<tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                           {Object.values(row).map((v, j) => (<td key={j} className="p-2 font-mono text-xs max-w-[200px] truncate">
                               {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                             </td>))}
                         </tr>))}
                     </tbody>
                   </table>)}
              </div>
            </Tabs_1.TabsContent>

            {/* GraphRAG Evidence/Citations Tab */}
            <Tabs_1.TabsContent value="citations" className="flex-1 pt-4 overflow-auto">
              <div className="grid grid-cols-1 gap-4">
                {result?.citations?.map((cit, i) => (<Card_1.Card key={i}>
                    <Card_1.CardHeader className="py-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{cit.source}</span>
                        <Badge_1.Badge variant="outline">{(cit.confidence * 100).toFixed(0)}% Conf.</Badge_1.Badge>
                      </div>
                    </Card_1.CardHeader>
                    <Card_1.CardContent className="py-2 text-sm text-muted-foreground flex gap-2 items-center">
                      <lucide_react_1.BookOpen className="w-4 h-4"/>
                      <span>ID: {cit.id}</span>
                      {cit.url && <a href={cit.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline ml-2">View Source</a>}
                    </Card_1.CardContent>
                  </Card_1.Card>))}
              </div>
            </Tabs_1.TabsContent>
          </Tabs_1.Tabs>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
