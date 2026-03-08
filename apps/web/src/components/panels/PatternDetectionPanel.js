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
exports.PatternDetectionPanel = PatternDetectionPanel;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const select_1 = require("@/components/ui/select");
const Alert_1 = require("@/components/ui/Alert");
function PatternDetectionPanel({ onResults, className, }) {
    const [templates, setTemplates] = (0, react_1.useState)({});
    const [selectedTemplate, setSelectedTemplate] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [running, setRunning] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchTemplates();
    }, []);
    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/patterns/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) {
                throw new Error('Failed to fetch templates');
            }
            const data = await res.json();
            setTemplates(data.data);
        }
        catch (err) {
            console.error(err);
            setError('Failed to load pattern templates');
        }
        finally {
            setLoading(false);
        }
    };
    const handleRun = async () => {
        if (!selectedTemplate)
            return;
        try {
            setRunning(true);
            setError(null);
            const res = await fetch(`/api/patterns/templates/${selectedTemplate}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({}), // Params can be added here later
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to execute pattern');
            }
            const data = await res.json();
            // Data might be nested under 'data' and contain { nodes, edges } arrays
            // We need to flatten this if it returns multiple matches
            const allEntities = [];
            const allRelationships = [];
            if (Array.isArray(data.data)) {
                data.data.forEach((match) => {
                    if (match.nodes)
                        allEntities.push(...match.nodes);
                    if (match.edges)
                        allRelationships.push(...match.edges);
                });
            }
            // Deduplicate by ID
            const uniqueEntities = Array.from(new Map(allEntities.map(e => [e.id, e])).values());
            const uniqueRelationships = Array.from(new Map(allRelationships.map(r => [r.id, r])).values());
            onResults(uniqueEntities, uniqueRelationships);
            if (uniqueEntities.length === 0) {
                setError('No matches found for this pattern.');
            }
        }
        catch (err) {
            console.error(err);
            setError(err.message);
        }
        finally {
            setRunning(false);
        }
    };
    return (<div className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
            <lucide_react_1.Info className="h-5 w-5"/>
            Pattern Detection
        </h3>
        <p className="text-sm text-muted-foreground">
          Run sophisticated graph algorithms to detect threats and anomalies.
        </p>
      </div>

      {loading ? (<div className="flex justify-center p-4">
          <lucide_react_1.Loader2 className="h-6 w-6 animate-spin"/>
        </div>) : (<div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Pattern</label>
            <select_1.Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="Choose a pattern..."/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {Object.entries(templates).map(([key, tpl]) => (<select_1.SelectItem key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          {selectedTemplate && templates[selectedTemplate] && (<div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Description:</p>
              <p className="text-muted-foreground">
                {templates[selectedTemplate].description}
              </p>
            </div>)}

          <Button_1.Button className="w-full" onClick={handleRun} disabled={!selectedTemplate || running}>
            {running ? (<>
                <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Running Analysis...
              </>) : (<>
                <lucide_react_1.Play className="mr-2 h-4 w-4"/>
                Run Pattern Detection
              </>)}
          </Button_1.Button>

          {error && (<Alert_1.Alert variant={error.includes('No matches') ? "default" : "destructive"}>
              <lucide_react_1.AlertTriangle className="h-4 w-4"/>
              <Alert_1.AlertTitle>{error.includes('No matches') ? 'Info' : 'Error'}</Alert_1.AlertTitle>
              <Alert_1.AlertDescription>{error}</Alert_1.AlertDescription>
            </Alert_1.Alert>)}
        </div>)}
    </div>);
}
