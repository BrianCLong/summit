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
exports.ReportEditor = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const ReportEditor = () => {
    const [content, setContent] = (0, react_1.useState)('');
    const [citations, setCitations] = (0, react_1.useState)([]);
    const [error, setError] = (0, react_1.useState)(null);
    const [result, setResult] = (0, react_1.useState)(null);
    const addCitation = () => {
        // Mock citation addition
        const id = prompt("Enter Evidence ID:");
        if (id) {
            setCitations([...citations, { evidenceId: id, text: `Evidence content for ${id}` }]);
        }
    };
    const handlePublish = async () => {
        setError(null);
        try {
            const res = await fetch('/reporting/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: "New Investigation Report",
                    sections: [{ title: "Main Body", content, type: "text" }],
                    citations,
                    ch: ["Hypothesis A: It was a cyberattack", "Hypothesis B: It was an insider"],
                    coi: ["No conflicts declared"]
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
            }
            else {
                setResult(data);
            }
        }
        catch (e) {
            setError(e.message);
        }
    };
    return (<div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Report Studio</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card_1.Card>
          <Card_1.CardHeader><Card_1.CardTitle>Editor</Card_1.CardTitle></Card_1.CardHeader>
          <Card_1.CardContent className="space-y-4">
            <textarea className="w-full h-64 p-2 border rounded" value={content} onChange={e => setContent(e.target.value)} placeholder="Write your analysis here..."/>
            <div className="flex gap-2">
              <Button_1.Button onClick={addCitation}>+ Add Citation</Button_1.Button>
              <Button_1.Button onClick={handlePublish} variant="default">Publish Report</Button_1.Button>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader><Card_1.CardTitle>Citations & Metadata</Card_1.CardTitle></Card_1.CardHeader>
          <Card_1.CardContent>
            {citations.length === 0 && <p className="text-gray-500">No citations attached.</p>}
            <ul className="list-disc pl-5">
              {citations.map((c, i) => (<li key={i}>{c.evidenceId}</li>))}
            </ul>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>)}

      {result && (<Card_1.Card className="bg-green-50">
           <Card_1.CardHeader><Card_1.CardTitle>Published Successfully</Card_1.CardTitle></Card_1.CardHeader>
           <Card_1.CardContent>
             <pre className="text-xs overflow-auto">
               {JSON.stringify(result.manifest, null, 2)}
             </pre>
           </Card_1.CardContent>
        </Card_1.Card>)}
    </div>);
};
exports.ReportEditor = ReportEditor;
