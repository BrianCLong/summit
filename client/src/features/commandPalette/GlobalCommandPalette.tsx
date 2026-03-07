import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CommandPalette from "./CommandPalette";
import { registerCommand } from "./commandRegistry";

type GlobalCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

function useRegisterDefaultCommands() {
  const navigate = useNavigate();

  useEffect(() => {
    const registrars = [
      registerCommand({
        id: "open-case",
        title: "Open case workspace",
        description: "Jump to case management",
        href: "/cases",
        category: "Navigation",
        keywords: ["investigation", "case", "workspace"],
        action: () => navigate("/cases"),
      }),
      registerCommand({
        id: "switch-workspace",
        title: "Switch workspace",
        description: "Change to another analyst workspace",
        href: "/workspaces",
        category: "Navigation",
        keywords: ["workspace", "context"],
        action: () => navigate("/workspaces"),
      }),
      registerCommand({
        id: "create-note",
        title: "Create note",
        description: "Capture a quick note",
        href: "/notes",
        category: "Actions",
        keywords: ["note", "capture", "draft"],
        action: () => navigate("/notes"),
      }),
      registerCommand({
        id: "jump-graph",
        title: "Jump to graph",
        description: "Open graph explorer",
        href: "/graph",
        category: "Navigation",
        keywords: ["graph", "entities", "relationships"],
        action: () => navigate("/graph"),
      }),
      registerCommand({
        id: "jump-timeline",
        title: "Jump to timeline",
        description: "Open investigation timeline",
        href: "/investigations",
        category: "Navigation",
        keywords: ["timeline", "events"],
        action: () => navigate("/investigations"),
      }),
      registerCommand({
        id: "jump-map",
        title: "Jump to map",
        description: "Open GeoInt map",
        href: "/geoint",
        category: "Navigation",
        keywords: ["map", "geoint", "location"],
        action: () => navigate("/geoint"),
      }),
      registerCommand({
        id: "open-settings",
        title: "Open settings",
        description: "Platform and system settings",
        href: "/system",
        category: "Navigation",
        keywords: ["settings", "admin"],
        action: () => navigate("/system"),
      }),
    ];

    return () => registrars.forEach((unregister) => unregister());
  }, [navigate]);
}

export function GlobalCommandPalette({ open, onClose }: GlobalCommandPaletteProps) {
  useRegisterDefaultCommands();
  return <CommandPalette open={open} onClose={onClose} />;
}

export default GlobalCommandPalette;
