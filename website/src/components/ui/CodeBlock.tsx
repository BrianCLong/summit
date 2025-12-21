import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        'mt-3 overflow-x-auto rounded-lg bg-[rgba(0,0,0,0.4)] p-4 text-sm',
        className,
      )}
    >
      <code className="text-[var(--accent)]">{code}</code>
    </pre>
  );
}
