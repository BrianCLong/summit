"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand = registerCommand;
exports.useCommandRegistry = useCommandRegistry;
exports.__resetCommandRegistryForTests = __resetCommandRegistryForTests;
const react_1 = require("react");
class CommandRegistry {
    commands = new Map();
    listeners = new Set();
    register(command) {
        this.commands.set(command.id, command);
        this.notify();
        return () => {
            this.commands.delete(command.id);
            this.notify();
        };
    }
    getCommands() {
        return Array.from(this.commands.values());
    }
    subscribe(listener) {
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
    notify() {
        const snapshot = this.getCommands();
        this.listeners.forEach((listener) => listener(snapshot));
    }
}
const registry = new CommandRegistry();
function registerCommand(command) {
    return registry.register(command);
}
function useCommandRegistry() {
    const [commands, setCommands] = (0, react_1.useState)(registry.getCommands());
    (0, react_1.useEffect)(() => registry.subscribe(setCommands), []);
    return commands;
}
// Testing helper
function __resetCommandRegistryForTests() {
    registry.resetForTests();
}
