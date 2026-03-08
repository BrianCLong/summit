"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchSessionTabs = SearchSessionTabs;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const Tabs_1 = require("@/components/ui/Tabs");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const utils_1 = require("@/lib/utils");
function SearchSessionTabs({ sessions, activeSessionId, onAddSession, onSelectSession, onCloseSession, onDuplicateSession, onResetSession, onExportSession, onImportSession, }) {
    const activeSession = (0, react_1.useMemo)(() => sessions.find(session => session.id === activeSessionId), [activeSessionId, sessions]);
    const [importValue, setImportValue] = (0, react_1.useState)('');
    const [importError, setImportError] = (0, react_1.useState)(null);
    const [exportPreview, setExportPreview] = (0, react_1.useState)(null);
    const [showImport, setShowImport] = (0, react_1.useState)(false);
    const handleExport = () => {
        if (!activeSession) {
            return;
        }
        const json = onExportSession(activeSession.id);
        setExportPreview(json);
    };
    const handleImport = () => {
        const success = onImportSession(importValue);
        if (success) {
            setImportValue('');
            setImportError(null);
            setShowImport(false);
        }
        else {
            setImportError('Unable to import session JSON. Please verify the payload.');
        }
    };
    return (<div data-testid="search-session-tabs" className="space-y-3 rounded-md border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Tabs_1.Tabs value={activeSessionId} onValueChange={onSelectSession}>
            <Tabs_1.TabsList className="flex flex-wrap gap-1">
              {sessions.map(session => (<Tabs_1.TabsTrigger key={session.id} value={session.id} className={(0, utils_1.cn)('flex items-center gap-2 px-3 py-2 text-xs md:text-sm', session.stale && 'border border-amber-200 bg-amber-50 text-amber-800')} data-testid="search-session-tab">
                  <span className="truncate max-w-[140px]">{session.name}</span>
                  {session.stale && (<Badge_1.Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] font-medium uppercase text-amber-800">
                      stale
                    </Badge_1.Badge>)}
                  {sessions.length > 1 && (<button type="button" aria-label={`Close ${session.name}`} data-testid="close-session" className="rounded-sm p-1 hover:bg-muted" onClick={event => {
                    event.stopPropagation();
                    onCloseSession(session.id);
                }}>
                      <lucide_react_1.X className="h-3 w-3"/>
                    </button>)}
                </Tabs_1.TabsTrigger>))}
              <Button_1.Button type="button" size="icon" variant="ghost" aria-label="New search session" data-testid="add-session" onClick={onAddSession} className="h-8 w-8">
                <lucide_react_1.Plus className="h-4 w-4"/>
              </Button_1.Button>
            </Tabs_1.TabsList>
          </Tabs_1.Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button_1.Button type="button" variant="outline" size="sm" onClick={() => activeSession && onDuplicateSession(activeSession.id)} disabled={!activeSession}>
              <lucide_react_1.Copy className="mr-2 h-4 w-4"/>
              Duplicate
            </Button_1.Button>
            <Button_1.Button type="button" variant="outline" size="sm" onClick={() => activeSession && onResetSession(activeSession.id)} disabled={!activeSession}>
              <lucide_react_1.RefreshCcw className="mr-2 h-4 w-4"/>
              Reset
            </Button_1.Button>
            <Button_1.Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={!activeSession}>
              <lucide_react_1.Download className="mr-2 h-4 w-4"/>
              Export
            </Button_1.Button>
            <Button_1.Button type="button" variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
              <lucide_react_1.Upload className="mr-2 h-4 w-4"/>
              Import
            </Button_1.Button>
          </div>
        </div>

        {activeSession?.stale && (<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800" role="status">
            <lucide_react_1.AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Results may have changed</p>
              <p className="text-xs text-amber-700/80">
                Refresh this session to ensure filters and selections reflect the latest data.
              </p>
            </div>
          </div>)}

        {exportPreview && (<div className="space-y-1 rounded-md border border-muted bg-muted/30 p-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Session JSON copied locally</span>
              <button type="button" className="text-[11px] font-medium underline" onClick={() => setExportPreview(null)}>
                Dismiss
              </button>
            </div>
            <pre className="max-h-32 overflow-auto rounded bg-background p-2 text-[11px] leading-tight">
              {exportPreview}
            </pre>
          </div>)}

        {showImport && (<div className="space-y-2 rounded-md border border-muted bg-background/70 p-3">
            <label className="text-xs font-medium text-muted-foreground">
              Paste session JSON
            </label>
            <textarea value={importValue} onChange={e => setImportValue(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-xs" rows={3} placeholder='{"version":1,"session":{...}}'/>
            {importError && (<p className="text-xs text-destructive">{importError}</p>)}
            <div className="flex items-center gap-2">
              <Button_1.Button type="button" size="sm" onClick={handleImport}>
                Import session
              </Button_1.Button>
              <Button_1.Button type="button" size="sm" variant="ghost" onClick={() => {
                setShowImport(false);
                setImportError(null);
            }}>
                Cancel
              </Button_1.Button>
            </div>
          </div>)}
      </div>
    </div>);
}
