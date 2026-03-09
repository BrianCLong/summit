import React from 'react';

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

export interface CodeDiffViewerProps {
  title?: string;
  language?: string;
  lines: DiffLine[];
  maxHeight?: string;
  className?: string;
}

const lineTypeStyles: Record<string, { bg: string; text: string; prefix: string }> = {
  add: { bg: 'bg-semantic-success/10', text: 'text-semantic-success', prefix: '+' },
  remove: { bg: 'bg-semantic-error/10', text: 'text-semantic-error', prefix: '-' },
  context: { bg: '', text: 'text-fg-secondary', prefix: ' ' },
};

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ title, language, lines, maxHeight = '400px', className = '' }) => {
  return (
    <div className={`border border-border-default rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border-default">
          <span className="text-xs font-mono text-fg-secondary">{title}</span>
          {language && <span className="text-2xs text-fg-tertiary uppercase">{language}</span>}
        </div>
      )}
      <div className="overflow-auto font-mono text-xs" style={{ maxHeight }}>
        {lines.map((line, i) => {
          const style = lineTypeStyles[line.type];
          return (
            <div key={i} className={`flex ${style.bg} border-b border-border-muted/30 last:border-0`}>
              <span className="w-10 shrink-0 text-right pr-2 py-px text-fg-muted select-none">{line.lineNumber?.old ?? ''}</span>
              <span className="w-10 shrink-0 text-right pr-2 py-px text-fg-muted select-none">{line.lineNumber?.new ?? ''}</span>
              <span className={`w-4 shrink-0 text-center py-px ${style.text} select-none`}>{style.prefix}</span>
              <span className={`flex-1 py-px pr-4 ${style.text} whitespace-pre`}>{line.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
