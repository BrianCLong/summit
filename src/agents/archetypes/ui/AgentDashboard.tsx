/**
 * AgentDashboard - React component for displaying agent archetypes
 *
 * Provides a unified dashboard for interacting with all agent archetypes
 * in the Switchboard interface.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  agentCommands,
  commandCategories,
  searchCommands,
  createCommandPaletteProvider,
  formatAgentResult,
  type AgentCommand,
  type FormattedResult,
} from './AgentCommands';
import { AgentContext, AgentResult, AgentStatusInfo, AgentRole } from '../base/types';
import { getAgentRegistry } from '../base/AgentRegistry';

// Props for the AgentDashboard component
interface AgentDashboardProps {
  context: AgentContext;
  onCommandExecuted?: (commandId: string, result: AgentResult) => void;
  onError?: (error: Error) => void;
  className?: string;
}

// Agent card state
interface AgentCardState {
  role: AgentRole;
  name: string;
  status: AgentStatusInfo | null;
  lastResult: FormattedResult | null;
  isLoading: boolean;
  error: string | null;
}

// Main AgentDashboard component
export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  context,
  onCommandExecuted,
  onError,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<AgentCommand[]>(agentCommands);
  const [selectedCommand, setSelectedCommand] = useState<AgentCommand | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<FormattedResult | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Map<AgentRole, AgentStatusInfo>>(new Map());

  // Initialize command palette provider
  const commandProvider = createCommandPaletteProvider();

  // Fetch agent statuses on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const registry = getAgentRegistry();
        const statuses = registry.getStatusAll();
        setAgentStatuses(statuses);
      } catch (error) {
        console.error('Failed to fetch agent statuses:', error);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  // Handle search
  useEffect(() => {
    const results = searchCommands(searchQuery);
    setFilteredCommands(results);
  }, [searchQuery]);

  // Execute command
  const executeCommand = useCallback(async (command: AgentCommand) => {
    setSelectedCommand(command);
    setIsExecuting(true);
    setLastResult(null);

    try {
      const result = await command.execute(context);
      const formatted = formatAgentResult(result, command.id);
      setLastResult(formatted);

      if (onCommandExecuted) {
        onCommandExecuted(command.id, result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({
        title: 'Error',
        summary: errorMessage,
        details: [],
        recommendations: [],
        metadata: {},
      });

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsExecuting(false);
    }
  }, [context, onCommandExecuted, onError]);

  // Render agent status badge
  const renderStatusBadge = (status: AgentStatusInfo | undefined) => {
    if (!status) return null;

    const statusColors: Record<string, string> = {
      ready: 'bg-green-500',
      busy: 'bg-yellow-500',
      error: 'bg-red-500',
      offline: 'bg-gray-500',
      initializing: 'bg-blue-500',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${statusColors[status.status] || 'bg-gray-500'}`}>
        {status.status}
      </span>
    );
  };

  // Render command card
  const renderCommandCard = (command: AgentCommand) => {
    const isSelected = selectedCommand?.id === command.id;
    const isRunning = isSelected && isExecuting;

    return (
      <button
        key={command.id}
        onClick={() => executeCommand(command)}
        disabled={isRunning}
        className={`
          w-full text-left p-4 rounded-lg border transition-all
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          ${isRunning ? 'opacity-75 cursor-wait' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{command.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{command.label}</div>
            <div className="text-sm text-gray-500">{command.description}</div>
          </div>
          {isRunning && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          )}
        </div>
      </button>
    );
  };

  // Render category
  const renderCategory = (category: typeof commandCategories[0]) => {
    const status = agentStatuses.get(category.id as AgentRole);
    const categoryCommands = filteredCommands.filter(c => c.agentRole === category.id);

    if (categoryCommands.length === 0) return null;

    return (
      <div key={category.id} className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">{category.icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{category.label}</h3>
          {renderStatusBadge(status)}
        </div>
        <div className="grid gap-2">
          {categoryCommands.map(renderCommandCard)}
        </div>
      </div>
    );
  };

  // Render result
  const renderResult = () => {
    if (!lastResult) return null;

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{lastResult.title}</h3>
        <p className="text-gray-600 mb-4">{lastResult.summary}</p>

        {lastResult.details.map((detail: any, index) => (
          <div key={index} className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">{detail.label}</h4>
            {detail.items.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-600">
                {detail.items.map((item: any, itemIndex: number) => (
                  <li key={itemIndex}>
                    {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>
        ))}

        {lastResult.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {lastResult.recommendations.map((rec: any, index) => (
                <li key={index}>{rec.title}: {rec.description}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`agent-dashboard ${className}`}>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search commands... (e.g., 'brief', 'pipeline', 'incident')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Commands by category */}
      <div className="space-y-6">
        {commandCategories.map(renderCategory)}
      </div>

      {/* Result */}
      {renderResult()}
    </div>
  );
};

// Quick command palette for ⌘K integration
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context: AgentContext;
  onCommandExecuted?: (commandId: string, result: AgentResult) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  context,
  onCommandExecuted,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AgentCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  // Update results when query changes
  useEffect(() => {
    setResults(searchCommands(query));
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          executeSelected();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Execute selected command
  const executeSelected = async () => {
    const command = results[selectedIndex];
    if (!command || isExecuting) return;

    setIsExecuting(true);
    try {
      const result = await command.execute(context);
      if (onCommandExecuted) {
        onCommandExecuted(command.id, result);
      }
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-4 py-2 text-lg border-0 focus:ring-0 outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.map((command, index) => (
            <button
              key={command.id}
              onClick={() => {
                setSelectedIndex(index);
                executeSelected();
              }}
              className={`
                w-full text-left px-4 py-3 flex items-center gap-3
                ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <span className="text-xl">{command.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{command.label}</div>
                <div className="text-sm text-gray-500">{command.description}</div>
              </div>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                {command.agentRole}
              </span>
            </button>
          ))}

          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex gap-4">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
};

// Agent status tiles for dashboard
interface AgentStatusTilesProps {
  className?: string;
}

export const AgentStatusTiles: React.FC<AgentStatusTilesProps> = ({ className = '' }) => {
  const [statuses, setStatuses] = useState<Map<AgentRole, AgentStatusInfo>>(new Map());

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const registry = getAgentRegistry();
        const statusMap = registry.getStatusAll();
        setStatuses(statusMap);
      } catch (error) {
        console.error('Failed to fetch statuses:', error);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  const agents = [
    { role: 'chief_of_staff' as AgentRole, name: 'AI Chief of Staff', icon: '🎯' },
    { role: 'coo' as AgentRole, name: 'AI COO', icon: '🏭' },
    { role: 'revops' as AgentRole, name: 'AI RevOps', icon: '📈' },
  ];

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {agents.map(agent => {
        const status = statuses.get(agent.role);
        return (
          <div
            key={agent.role}
            className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{agent.icon}</span>
              <span className="font-medium">{agent.name}</span>
            </div>
            <div className="text-sm text-gray-500">
              Status: <span className={`font-medium ${status?.status === 'ready' ? 'text-green-600' : 'text-gray-600'}`}>
                {status?.status || 'Unknown'}
              </span>
            </div>
            {status?.currentTask && (
              <div className="text-xs text-gray-400 mt-1">
                Current: {status.currentTask}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AgentDashboard;
