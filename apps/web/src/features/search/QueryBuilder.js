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
exports.QueryBuilder = QueryBuilder;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const Popover_1 = require("@/components/ui/Popover");
function QueryBuilder({ onSearch }) {
    const [filters, setFilters] = (0, react_1.useState)([]);
    const [term, setTerm] = (0, react_1.useState)('');
    const addFilter = (type) => {
        setFilters([...filters, { id: Math.random().toString(), type, value: '' }]);
    };
    const removeFilter = (id) => {
        setFilters(filters.filter(f => f.id !== id));
    };
    const updateFilter = (id, value, operator) => {
        setFilters(filters.map(f => (f.id === id ? { ...f, value, operator } : f)));
    };
    const constructQuery = () => {
        let q = term;
        filters.forEach(f => {
            if (!f.value)
                return;
            if (f.type === 'date') {
                q += ` ${f.operator || 'since'}:${f.value}`;
            }
            else if (f.type === 'relationship') {
                q += ` rel:${f.value}`;
            }
            else {
                q += ` ${f.type}:${f.value}`;
            }
        });
        return q.trim();
    };
    const handleSearch = () => {
        onSearch(constructQuery());
    };
    return (<div className="p-4 space-y-4 border rounded-md bg-card">
      <div className="flex gap-2">
        <input_1.Input placeholder="Natural language search (e.g. 'Cases involving Intel last week')" value={term} onChange={(e) => setTerm(e.target.value)} className="flex-1"/>
        <Button_1.Button onClick={handleSearch}>
          <lucide_react_1.Search className="w-4 h-4 mr-2"/>
          Search
        </Button_1.Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (<div key={filter.id} className="flex items-center gap-2 p-2 text-sm border rounded bg-background">
              <span className="font-medium capitalize text-muted-foreground">{filter.type}</span>

              {filter.type === 'date' && (<select_1.Select value={filter.operator || 'since'} onValueChange={(val) => updateFilter(filter.id, filter.value, val)}>
                  <select_1.SelectTrigger className="h-8 w-[100px]">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="since">Since</select_1.SelectItem>
                    <select_1.SelectItem value="before">Before</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>)}

              <input_1.Input className="h-8 w-[150px]" placeholder="Value..." value={filter.value} onChange={(e) => updateFilter(filter.id, e.target.value, filter.operator)}/>

              <Button_1.Button variant="ghost" size="sm" onClick={() => removeFilter(filter.id)}>
                <lucide_react_1.Trash className="w-3 h-3 text-destructive"/>
              </Button_1.Button>
            </div>))}

          <Popover_1.Popover>
            <Popover_1.PopoverTrigger asChild>
              <Button_1.Button variant="outline" size="sm" className="h-10 border-dashed">
                <lucide_react_1.Plus className="w-4 h-4 mr-2"/> Add Filter
              </Button_1.Button>
            </Popover_1.PopoverTrigger>
            <Popover_1.PopoverContent className="w-48">
              <div className="grid gap-1">
                <Button_1.Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('entity')}>
                  <lucide_react_1.User className="w-4 h-4 mr-2"/> Entity
                </Button_1.Button>
                <Button_1.Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('date')}>
                  <lucide_react_1.Calendar className="w-4 h-4 mr-2"/> Date
                </Button_1.Button>
                <Button_1.Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('relationship')}>
                  <lucide_react_1.GitBranch className="w-4 h-4 mr-2"/> Relationship
                </Button_1.Button>
                <Button_1.Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('status')}>
                  <lucide_react_1.Filter className="w-4 h-4 mr-2"/> Status
                </Button_1.Button>
              </div>
            </Popover_1.PopoverContent>
          </Popover_1.Popover>
        </div>
      </div>
    </div>);
}
