"use strict";
// src/components/MaestroRunConsole.tsx
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
exports.MaestroRunConsole = void 0;
const React = __importStar(require("react"));
const react_1 = require("react");
const useMaestroRun_1 = require("@/hooks/useMaestroRun");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const textarea_1 = require("@/components/ui/textarea");
const label_1 = require("@/components/ui/label");
const MaestroRunConsoleParts_1 = require("./MaestroRunConsoleParts");
const MaestroRunConsole = ({ userId, }) => {
    const [input, setInput] = (0, react_1.useState)('');
    const textareaRef = (0, react_1.useRef)(null);
    const { state, run, reset } = (0, useMaestroRun_1.useMaestroRun)(userId);
    const QUICK_PROMPTS = [
        'Analyze the last 3 PRs for security risks',
        'Summarize recent deployment failures',
        'Draft a release note for the latest commit',
    ];
    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }
        if (!input.trim()) {
            return;
        }
        await run(input);
    };
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };
    const handleReset = () => {
        setInput('');
        reset();
    };
    const selectedRun = state.data;
    return (<div className="flex flex-col gap-4 md:gap-6">
      {/* Top row: input + summary */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card_1.Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
          <Card_1.CardHeader className="flex flex-row items-center justify-between">
            <Card_1.CardTitle className="flex items-center gap-2 text-slate-50">
              <lucide_react_1.Terminal className="h-5 w-5"/>
              Maestro Run Console
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full gap-1.5">
                <label_1.Label htmlFor="maestro-prompt">Prompt</label_1.Label>
                <textarea_1.Textarea ref={textareaRef} id="maestro-prompt" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe what you want Maestro to do. Example: 'Review the last 5 PRs, summarize risk, and propose a follow-up CI improvement.'" className="min-h-[120px] resize-none text-sm"/>

                {!input && (<div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-medium text-slate-500">
                      Try:
                    </span>
                    {QUICK_PROMPTS.map(prompt => (<button key={prompt} type="button" onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                }} aria-label={`Use prompt: ${prompt}`} className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                        {prompt}
                      </button>))}
                  </div>)}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"/>
                  Connected as <span className="font-mono">{userId}</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedRun && (<Button_1.Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                      Clear
                    </Button_1.Button>)}
                  <span className="text-[10px] text-slate-500 hidden sm:inline-block mr-1">
                    <kbd className="font-sans border border-slate-700 rounded px-1.5 py-0.5 text-[10px] bg-slate-900/50 text-slate-400 shadow-sm">
                      ⌘+Enter
                    </kbd>
                  </span>
                  <Button_1.Button type="submit" disabled={state.isRunning || !input.trim()} className="gap-2">
                    {state.isRunning ? (<>
                        <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
                        Running…
                      </>) : (<>
                        <lucide_react_1.Play className="h-4 w-4"/>
                        Run with Maestro
                      </>)}
                  </Button_1.Button>
                </div>
              </div>

              {state.error && (<p className="text-xs text-red-400 mt-1">{state.error}</p>)}
            </form>
          </Card_1.CardContent>
        </Card_1.Card>

        <MaestroRunConsoleParts_1.RunSummary selectedRun={selectedRun}/>
      </div>

      {/* Bottom: tasks & outputs */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        <MaestroRunConsoleParts_1.RunTasks selectedRun={selectedRun}/>
        <MaestroRunConsoleParts_1.RunOutputs selectedRun={selectedRun}/>
      </div>
    </div>);
};
exports.MaestroRunConsole = MaestroRunConsole;
