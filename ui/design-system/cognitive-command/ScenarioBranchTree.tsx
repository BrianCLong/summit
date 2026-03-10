import React from 'react';

interface BranchNode {
  id: string;
  label: string;
  probability: number;
  isBaseline?: boolean;
  children?: BranchNode[];
}

interface ScenarioBranchTreeProps {
  root: BranchNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

function BranchNodeItem({ node, depth, selectedId, onSelect }: { node: BranchNode; depth: number; selectedId?: string; onSelect?: (id: string) => void }) {
  const isSelected = node.id === selectedId;
  const pct = Math.round(node.probability * 100);

  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelect?.(node.id)}
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
          isSelected ? 'bg-cyan-900 text-cyan-200' : 'text-zinc-400 hover:bg-zinc-800'
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <span className={`h-2 w-2 rounded-full ${node.isBaseline ? 'bg-zinc-500' : 'bg-cyan-500'}`} />
        <span className="flex-1 truncate">{node.label}</span>
        <span className="font-mono text-[10px] text-zinc-500">{pct}%</span>
      </button>
      {node.children?.map((child) => (
        <BranchNodeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function ScenarioBranchTree({ root, selectedId, onSelect, className = '' }: ScenarioBranchTreeProps) {
  return (
    <div className={`space-y-1 ${className}`} role="tree" aria-label="Scenario branches">
      <BranchNodeItem node={root} depth={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
