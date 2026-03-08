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
exports.useCommandPalette = useCommandPalette;
exports.CommandPaletteProvider = CommandPaletteProvider;
// =============================================
// Command Palette Context for Maestro UI
// =============================================
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const CommandPaletteContext = (0, react_1.createContext)(undefined);
function useCommandPalette() {
    const context = (0, react_1.useContext)(CommandPaletteContext);
    if (!context) {
        throw new Error('useCommandPalette must be used within CommandPaletteProvider');
    }
    return context;
}
function CommandPaletteProvider({ children, }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [actions, setActions] = (0, react_1.useState)([]);
    const navigate = (0, react_router_dom_1.useNavigate)();
    // Default navigation actions
    (0, react_1.useEffect)(() => {
        const defaultActions = [
            {
                id: 'nav-overview',
                title: 'Go to Overview',
                section: 'Navigation',
                action: () => navigate('/maestro'),
                keywords: ['overview', 'dashboard', 'home'],
            },
            {
                id: 'nav-runs',
                title: 'Go to Runs',
                section: 'Navigation',
                action: () => navigate('/maestro/runs'),
                keywords: ['runs', 'executions', 'workflow'],
            },
            {
                id: 'nav-runbooks',
                title: 'Go to Runbooks',
                section: 'Navigation',
                action: () => navigate('/maestro/runbooks'),
                keywords: ['runbooks', 'templates', 'pipelines'],
            },
            {
                id: 'nav-budgets',
                title: 'Go to Budgets',
                section: 'Navigation',
                action: () => navigate('/maestro/budgets'),
                keywords: ['budgets', 'cost', 'spend', 'finops'],
            },
            {
                id: 'nav-policies',
                title: 'Go to Policies',
                section: 'Navigation',
                action: () => navigate('/maestro/policies'),
                keywords: ['policies', 'opa', 'compliance', 'security'],
            },
        ];
        setActions(prev => [...prev, ...defaultActions]);
        return () => {
            setActions(prev => prev.filter(action => !defaultActions.find(def => def.id === action.id)));
        };
    }, [navigate]);
    // Keyboard shortcut handler
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen(true);
            }
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
    const registerAction = (action) => {
        setActions(prev => [...prev.filter(a => a.id !== action.id), action]);
    };
    const unregisterAction = (id) => {
        setActions(prev => prev.filter(action => action.id !== id));
    };
    return (<CommandPaletteContext.Provider value={{
            isOpen,
            setIsOpen,
            actions,
            registerAction,
            unregisterAction,
        }}>
      {children}
      {isOpen && <CommandPalette />}
    </CommandPaletteContext.Provider>);
}
// Command Palette Modal Component
function CommandPalette() {
    const { isOpen, setIsOpen, actions } = useCommandPalette();
    const [search, setSearch] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const filteredActions = actions.filter(action => action.title.toLowerCase().includes(search.toLowerCase()) ||
        action.keywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase())));
    const executeAction = (action) => {
        action.action();
        setIsOpen(false);
        setSearch('');
        setSelectedIndex(0);
    };
    (0, react_1.useEffect)(() => {
        setSelectedIndex(0);
    }, [search]);
    if (!isOpen) {
        return null;
    }
    return (<div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsOpen(false)}/>

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4">
          <input type="text" placeholder="Type a command or search..." className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={e => setSearch(e.target.value)} autoFocus onKeyDown={e => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(Math.min(selectedIndex + 1, filteredActions.length - 1));
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(Math.max(selectedIndex - 1, 0));
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredActions[selectedIndex]) {
                    executeAction(filteredActions[selectedIndex]);
                }
            }
        }}/>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (<div className="p-4 text-center text-gray-500">
              No commands found
            </div>) : (<div>
              {Object.entries(filteredActions.reduce((acc, action) => {
                acc[action.section] = acc[action.section] || [];
                acc[action.section].push(action);
                return acc;
            }, {})).map(([section, sectionActions]) => (<div key={section}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                    {section}
                  </div>
                  {sectionActions.map((action, index) => {
                    const globalIndex = filteredActions.indexOf(action);
                    return (<button key={action.id} className={`w-full px-4 py-3 text-left hover:bg-gray-100 ${globalIndex === selectedIndex
                            ? 'bg-blue-50 text-blue-700'
                            : ''}`} onClick={() => executeAction(action)}>
                        <div className="font-medium">{action.title}</div>
                        {action.subtitle && (<div className="text-sm text-gray-500">
                            {action.subtitle}
                          </div>)}
                      </button>);
                })}
                </div>))}
            </div>)}
        </div>
      </div>
    </div>);
}
