"use strict";
/**
 * Command Palette - Global search and quick actions (⌘K)
 */
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
exports.CommandPalette = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const utils_1 = require("@/lib/utils");
const icons_material_1 = require("@mui/icons-material");
const CommandPalette = ({ open, onClose, onCommandSelect, }) => {
    const theme = (0, material_1.useTheme)();
    const [query, setQuery] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    // Default commands
    const defaultCommands = (0, react_1.useMemo)(() => [
        // Recent
        {
            id: 'recent-1',
            type: 'recent',
            icon: <icons_material_1.History fontSize="small"/>,
            title: 'Payment webhook failures event',
        },
        {
            id: 'recent-2',
            type: 'recent',
            icon: <icons_material_1.History fontSize="small"/>,
            title: 'Acme Corp customer profile',
        },
        // Quick Actions
        {
            id: 'action-situation',
            type: 'action',
            icon: <icons_material_1.Add fontSize="small"/>,
            title: 'Create new situation',
            shortcut: `${utils_1.MODIFIER_KEY}N`,
        },
        {
            id: 'action-playbook',
            type: 'action',
            icon: <icons_material_1.PlayArrow fontSize="small"/>,
            title: 'Run playbook...',
        },
        {
            id: 'action-page',
            type: 'action',
            icon: <icons_material_1.NotificationsActive fontSize="small"/>,
            title: 'Page on-call',
        },
        {
            id: 'action-update',
            type: 'action',
            icon: <icons_material_1.Send fontSize="small"/>,
            title: 'Send team update',
        },
        // Navigation
        {
            id: 'nav-dashboard',
            type: 'navigation',
            icon: <icons_material_1.Dashboard fontSize="small"/>,
            title: 'Dashboard',
            shortcut: `${utils_1.MODIFIER_KEY}D`,
        },
        {
            id: 'nav-situations',
            type: 'navigation',
            icon: <icons_material_1.Dashboard fontSize="small"/>,
            title: 'Active Situations',
        },
        {
            id: 'nav-timeline',
            type: 'navigation',
            icon: <icons_material_1.Dashboard fontSize="small"/>,
            title: 'Event Timeline',
        },
        // Help
        {
            id: 'help-shortcuts',
            type: 'help',
            icon: <icons_material_1.Help fontSize="small"/>,
            title: 'Keyboard shortcuts',
            shortcut: '?',
        },
        {
            id: 'help-docs',
            type: 'help',
            icon: <icons_material_1.Help fontSize="small"/>,
            title: 'Documentation',
        },
    ], []);
    // Filter commands based on query
    const filteredCommands = (0, react_1.useMemo)(() => {
        if (!query)
            return defaultCommands;
        const lowerQuery = query.toLowerCase();
        return defaultCommands.filter((cmd) => cmd.title.toLowerCase().includes(lowerQuery) ||
            cmd.description?.toLowerCase().includes(lowerQuery));
    }, [query, defaultCommands]);
    // Group commands by type
    const groupedCommands = (0, react_1.useMemo)(() => {
        const groups = {
            recent: [],
            action: [],
            navigation: [],
            help: [],
        };
        filteredCommands.forEach((cmd) => {
            if (groups[cmd.type]) {
                groups[cmd.type].push(cmd);
            }
        });
        return groups;
    }, [filteredCommands]);
    // Reset state when opening
    (0, react_1.useEffect)(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [open]);
    // Keyboard navigation
    const handleKeyDown = (0, react_1.useCallback)((e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => prev < filteredCommands.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    handleSelect(filteredCommands[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [filteredCommands, selectedIndex, onClose]);
    const handleSelect = (command) => {
        onCommandSelect(command.id, { query });
        onClose();
    };
    const getGroupTitle = (type) => {
        switch (type) {
            case 'recent':
                return 'Recent';
            case 'action':
                return 'Quick Actions';
            case 'navigation':
                return 'Navigation';
            case 'help':
                return 'Help';
            default:
                return type;
        }
    };
    let currentIndex = -1;
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{
            sx: {
                position: 'absolute',
                top: '20%',
                borderRadius: 2,
            },
        }}>
      <material_1.DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <material_1.TextField autoFocus fullWidth placeholder="Search or type a command..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                <icons_material_1.Search color="action"/>
              </material_1.InputAdornment>),
            sx: {
                py: 1.5,
                px: 2,
                '& fieldset': { border: 'none' },
            },
        }}/>

        <material_1.Divider />

        {/* Command List */}
        <material_1.List sx={{ maxHeight: 400, overflowY: 'auto', py: 1 }}>
          {Object.entries(groupedCommands).map(([type, commands]) => commands.length > 0 && (<material_1.Box key={type}>
                  <material_1.Typography variant="caption" color="textSecondary" sx={{ px: 2, py: 1, display: 'block', fontWeight: 600 }}>
                    {getGroupTitle(type)}
                  </material_1.Typography>

                  {commands.map((command) => {
                currentIndex++;
                const isSelected = currentIndex === selectedIndex;
                return (<material_1.ListItem key={command.id} onClick={() => handleSelect(command)} sx={{
                        px: 2,
                        py: 1,
                        cursor: 'pointer',
                        bgcolor: isSelected
                            ? theme.palette.action.selected
                            : 'transparent',
                        '&:hover': {
                            bgcolor: theme.palette.action.hover,
                        },
                    }}>
                        <material_1.ListItemIcon sx={{ minWidth: 36 }}>
                          {command.icon}
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary={command.title} secondary={command.description} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }}/>
                        {command.shortcut && (<material_1.Typography variant="caption" color="textSecondary" sx={{
                            bgcolor: theme.palette.grey[100],
                            px: 1,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontFamily: 'monospace',
                        }}>
                            {command.shortcut}
                          </material_1.Typography>)}
                      </material_1.ListItem>);
            })}
                </material_1.Box>))}

          {filteredCommands.length === 0 && (<material_1.Box textAlign="center" py={3}>
              <material_1.Typography color="textSecondary">No results found</material_1.Typography>
            </material_1.Box>)}
        </material_1.List>

        {/* Footer */}
        <material_1.Divider />
        <material_1.Box display="flex" alignItems="center" justifyContent="center" gap={2} py={1} px={2} bgcolor={theme.palette.grey[50]}>
          <material_1.Typography variant="caption" color="textSecondary">
            ↑↓ Navigate
          </material_1.Typography>
          <material_1.Typography variant="caption" color="textSecondary">
            ↵ Select
          </material_1.Typography>
          <material_1.Typography variant="caption" color="textSecondary">
            esc Close
          </material_1.Typography>
        </material_1.Box>
      </material_1.DialogContent>
    </material_1.Dialog>);
};
exports.CommandPalette = CommandPalette;
exports.default = exports.CommandPalette;
