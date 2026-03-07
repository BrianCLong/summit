import { useEffect, useState } from "react";

export type Command = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  category?: string;
  keywords?: string[];
  action: () => void;
};

type Listener = (commands: Command[]) => void;

class CommandRegistry {
  private commands = new Map<string, Command>();

  private listeners = new Set<Listener>();

  register(command: Command): () => void {
    this.commands.set(command.id, command);
    this.notify();
    return () => {
      this.commands.delete(command.id);
      this.notify();
    };
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getCommands());
    return () => {
      this.listeners.delete(listener);
    };
  }

  resetForTests() {
    this.commands.clear();
    this.notify();
  }

  private notify() {
    const snapshot = this.getCommands();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

const registry = new CommandRegistry();

export function registerCommand(command: Command): () => void {
  return registry.register(command);
}

export function useCommandRegistry(): Command[] {
  const [commands, setCommands] = useState<Command[]>(registry.getCommands());

  useEffect(() => registry.subscribe(setCommands), []);

  return commands;
}

// Testing helper
export function __resetCommandRegistryForTests() {
  registry.resetForTests();
}
