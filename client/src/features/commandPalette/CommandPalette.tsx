import React, { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon, Star, StarBorder } from "@mui/icons-material";
import { Command, useCommandRegistry } from "./commandRegistry";

const FAVORITES_KEY = "command-palette:favorites";
const RECENTS_KEY = "command-palette:recents";
const TITLE_ID = "command-palette-title";

type PersistedList = string[];

type Section = "Recent" | "Favorite" | "Commands";

type DisplayCommand = {
  command: Command;
  section: Section;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

function readList(key: string): PersistedList {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PersistedList) : [];
  } catch {
    return [];
  }
}

function persistList(key: string, list: PersistedList) {
  localStorage.setItem(key, JSON.stringify(list));
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const commands = useCommandRegistry();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [favorites, setFavorites] = useState<PersistedList>(() => readList(FAVORITES_KEY));
  const [recents, setRecents] = useState<PersistedList>(() => readList(RECENTS_KEY));
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        includeScore: true,
        shouldSort: true,
        keys: ["title", "description", "keywords"],
        threshold: 0.35,
      }),
    [commands]
  );

  const baseResults = useMemo(() => {
    if (!query.trim()) {
      return commands;
    }
    return fuse.search(query.trim()).map((result) => result.item);
  }, [commands, fuse, query]);

  const displayCommands: DisplayCommand[] = useMemo(() => {
    const seen = new Set<string>();
    const favoriteSet = new Set(favorites);
    const recentCommands: DisplayCommand[] = [];
    const resolvedRecents = recents
      .map(
        (id) => baseResults.find((cmd) => cmd.id === id) ?? commands.find((cmd) => cmd.id === id)
      )
      .filter(Boolean) as Command[];

    resolvedRecents.forEach((cmd) => {
      if (seen.has(cmd.id)) return;
      seen.add(cmd.id);
      recentCommands.push({ command: cmd, section: "Recent" });
    });

    const remaining = baseResults.filter((cmd) => !seen.has(cmd.id));
    const favoritesFirst = remaining.sort((a, b) => {
      const aFav = favoriteSet.has(a.id) ? 1 : 0;
      const bFav = favoriteSet.has(b.id) ? 1 : 0;
      return bFav - aFav;
    });

    const fullList: DisplayCommand[] = [...recentCommands];
    favoritesFirst.forEach((cmd) => {
      const section = favoriteSet.has(cmd.id) ? "Favorite" : "Commands";
      fullList.push({ command: cmd, section });
    });

    return fullList;
  }, [baseResults, commands, favorites, recents]);

  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (cmd: Command) => {
    const updatedRecents = [cmd.id, ...recents.filter((id) => id !== cmd.id)];
    const trimmed = updatedRecents.slice(0, 8);
    setRecents(trimmed);
    persistList(RECENTS_KEY, trimmed);
    onClose();
    cmd.action();
  };

  const handleToggleFavorite = (commandId: string) => {
    setFavorites((prev) => {
      const isFavorite = prev.includes(commandId);
      const next = isFavorite ? prev.filter((id) => id !== commandId) : [commandId, ...prev];
      persistList(FAVORITES_KEY, next);
      return next;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (!displayCommands.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % displayCommands.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev === 0 ? displayCommands.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = displayCommands[highlightedIndex];
      if (target) {
        handleSelect(target.command);
      }
    }
  };

  const highlightedId = displayCommands[highlightedIndex]?.command.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby={TITLE_ID}>
      <DialogContent sx={{ p: 0 }}>
        <Box
          component="form"
          role="search"
          noValidate
          onKeyDown={handleKeyDown}
          sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ px: 0.5 }}
          >
            <Typography id={TITLE_ID} variant="h6">
              Command palette
            </Typography>
            <IconButton
              aria-label="Close command palette"
              edge="end"
              onClick={onClose}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            inputRef={inputRef}
            placeholder="Search commands, cases, workspaces…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              inputProps: {
                "aria-label": "Command palette search",
              },
            }}
          />
          <List
            role="listbox"
            aria-label="Available commands"
            sx={{ maxHeight: 360, overflowY: "auto", p: 0 }}
          >
            {displayCommands.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No commands match your search."
                  primaryTypographyProps={{ color: "text.secondary" }}
                />
              </ListItem>
            )}
            {displayCommands.map(({ command, section }, index) => (
              <ListItem
                key={command.id}
                disablePadding
                sx={{
                  borderTop:
                    index === 0 || displayCommands[index - 1].section === section
                      ? "none"
                      : "1px solid",
                  borderColor: "divider",
                }}
              >
                <ListItemButton
                  role="option"
                  aria-selected={highlightedId === command.id}
                  selected={highlightedId === command.id}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(command)}
                  sx={{ alignItems: "flex-start", gap: 1 }}
                >
                  <Box sx={{ minWidth: 82 }}>
                    <Chip
                      size="small"
                      label={section}
                      color={
                        section === "Favorite"
                          ? "warning"
                          : section === "Recent"
                            ? "info"
                            : "default"
                      }
                      variant="outlined"
                    />
                  </Box>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">{command.title}</Typography>
                      </Stack>
                    }
                    secondary={command.description ?? command.href ?? command.category}
                  />
                  <IconButton
                    aria-label={
                      favorites.includes(command.id) ? "Remove from favorites" : "Add to favorites"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleFavorite(command.id);
                    }}
                    size="small"
                  >
                    {favorites.includes(command.id) ? (
                      <Star fontSize="small" color="warning" />
                    ) : (
                      <StarBorder fontSize="small" />
                    )}
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
