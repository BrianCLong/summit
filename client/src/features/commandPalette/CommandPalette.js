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
exports.CommandPalette = CommandPalette;
const react_1 = __importStar(require("react"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const commandRegistry_1 = require("./commandRegistry");
const FAVORITES_KEY = 'command-palette:favorites';
const RECENTS_KEY = 'command-palette:recents';
const TITLE_ID = 'command-palette-title';
function readList(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function persistList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}
function CommandPalette({ open, onClose }) {
    const commands = (0, commandRegistry_1.useCommandRegistry)();
    const [query, setQuery] = (0, react_1.useState)('');
    const [highlightedIndex, setHighlightedIndex] = (0, react_1.useState)(0);
    const [favorites, setFavorites] = (0, react_1.useState)(() => readList(FAVORITES_KEY));
    const [recents, setRecents] = (0, react_1.useState)(() => readList(RECENTS_KEY));
    const inputRef = (0, react_1.useRef)(null);
    const fuse = (0, react_1.useMemo)(() => new fuse_js_1.default(commands, {
        includeScore: true,
        shouldSort: true,
        keys: ['title', 'description', 'keywords'],
        threshold: 0.35,
    }), [commands]);
    const baseResults = (0, react_1.useMemo)(() => {
        if (!query.trim()) {
            return commands;
        }
        return fuse.search(query.trim()).map((result) => result.item);
    }, [commands, fuse, query]);
    const displayCommands = (0, react_1.useMemo)(() => {
        const seen = new Set();
        const favoriteSet = new Set(favorites);
        const recentCommands = [];
        const resolvedRecents = recents
            .map((id) => baseResults.find((cmd) => cmd.id === id) ??
            commands.find((cmd) => cmd.id === id))
            .filter(Boolean);
        resolvedRecents.forEach((cmd) => {
            if (seen.has(cmd.id))
                return;
            seen.add(cmd.id);
            recentCommands.push({ command: cmd, section: 'Recent' });
        });
        const remaining = baseResults.filter((cmd) => !seen.has(cmd.id));
        const favoritesFirst = remaining.sort((a, b) => {
            const aFav = favoriteSet.has(a.id) ? 1 : 0;
            const bFav = favoriteSet.has(b.id) ? 1 : 0;
            return bFav - aFav;
        });
        const fullList = [...recentCommands];
        favoritesFirst.forEach((cmd) => {
            const section = favoriteSet.has(cmd.id) ? 'Favorite' : 'Commands';
            fullList.push({ command: cmd, section });
        });
        return fullList;
    }, [baseResults, commands, favorites, recents]);
    (0, react_1.useEffect)(() => {
        if (open) {
            setHighlightedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
        else {
            setQuery('');
        }
    }, [open]);
    const handleSelect = (cmd) => {
        const updatedRecents = [cmd.id, ...recents.filter((id) => id !== cmd.id)];
        const trimmed = updatedRecents.slice(0, 8);
        setRecents(trimmed);
        persistList(RECENTS_KEY, trimmed);
        onClose();
        cmd.action();
    };
    const handleToggleFavorite = (commandId) => {
        setFavorites((prev) => {
            const isFavorite = prev.includes(commandId);
            const next = isFavorite
                ? prev.filter((id) => id !== commandId)
                : [commandId, ...prev];
            persistList(FAVORITES_KEY, next);
            return next;
        });
    };
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            onClose();
            return;
        }
        if (!displayCommands.length)
            return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % displayCommands.length);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((prev) => prev === 0 ? displayCommands.length - 1 : prev - 1);
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            const target = displayCommands[highlightedIndex];
            if (target) {
                handleSelect(target.command);
            }
        }
    };
    const highlightedId = displayCommands[highlightedIndex]?.command.id;
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby={TITLE_ID}>
      <material_1.DialogContent sx={{ p: 0 }}>
        <material_1.Box component="form" role="search" noValidate onKeyDown={handleKeyDown} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
          <material_1.Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 0.5 }}>
            <material_1.Typography id={TITLE_ID} variant="h6">
              Command palette
            </material_1.Typography>
            <material_1.IconButton aria-label="Close command palette" edge="end" onClick={onClose} size="small">
              <icons_material_1.Close fontSize="small"/>
            </material_1.IconButton>
          </material_1.Stack>
          <material_1.TextField inputRef={inputRef} placeholder="Search commands, cases, workspaces…" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                  <icons_material_1.Search fontSize="small"/>
                </material_1.InputAdornment>),
            inputProps: {
                'aria-label': 'Command palette search',
            },
        }}/>
          <material_1.List role="listbox" aria-label="Available commands" sx={{ maxHeight: 360, overflowY: 'auto', p: 0 }}>
            {displayCommands.length === 0 && (<material_1.ListItem>
                <material_1.ListItemText primary="No commands match your search." primaryTypographyProps={{ color: 'text.secondary' }}/>
              </material_1.ListItem>)}
            {displayCommands.map(({ command, section }, index) => (<material_1.ListItem key={command.id} disablePadding sx={{
                borderTop: index === 0 || displayCommands[index - 1].section === section
                    ? 'none'
                    : '1px solid',
                borderColor: 'divider',
            }}>
                <material_1.ListItemButton role="option" aria-selected={highlightedId === command.id} selected={highlightedId === command.id} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => handleSelect(command)} sx={{ alignItems: 'flex-start', gap: 1 }}>
                  <material_1.Box sx={{ minWidth: 82 }}>
                    <material_1.Chip size="small" label={section} color={section === 'Favorite'
                ? 'warning'
                : section === 'Recent'
                    ? 'info'
                    : 'default'} variant="outlined"/>
                  </material_1.Box>
                  <material_1.ListItemText primary={<material_1.Stack direction="row" spacing={1} alignItems="center">
                        <material_1.Typography variant="subtitle1">
                          {command.title}
                        </material_1.Typography>
                      </material_1.Stack>} secondary={command.description ?? command.href ?? command.category}/>
                  <material_1.IconButton aria-label={favorites.includes(command.id)
                ? 'Remove from favorites'
                : 'Add to favorites'} onClick={(event) => {
                event.stopPropagation();
                handleToggleFavorite(command.id);
            }} size="small">
                    {favorites.includes(command.id) ? (<icons_material_1.Star fontSize="small" color="warning"/>) : (<icons_material_1.StarBorder fontSize="small"/>)}
                  </material_1.IconButton>
                </material_1.ListItemButton>
              </material_1.ListItem>))}
          </material_1.List>
        </material_1.Box>
      </material_1.DialogContent>
    </material_1.Dialog>);
}
exports.default = CommandPalette;
