import * as React from 'react';

import { cn } from '@/lib/utils';
import type { CopilotContext, CopilotMessage } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// CopilotChat — conversational interface with the intelligence copilot
// ---------------------------------------------------------------------------

export interface CopilotChatProps extends React.HTMLAttributes<HTMLDivElement> {
  context: CopilotContext;
  initialMessages?: CopilotMessage[];
  onSend?: (content: string) => void;
}

const ROLE_STYLES: Record<CopilotMessage['role'], string> = {
  user: 'bg-primary/10 text-foreground ml-8',
  copilot: 'bg-muted text-foreground mr-8',
  system: 'bg-yellow-500/10 text-yellow-300 mx-8 text-center text-xs',
};

const CopilotChat = React.forwardRef<HTMLDivElement, CopilotChatProps>(
  ({ className, context, initialMessages = [], onSend, ...props }, ref) => {
    const [messages, setMessages] = React.useState<CopilotMessage[]>(initialMessages);
    const [input, setInput] = React.useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;

        const userMsg: CopilotMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        onSend?.(text);
      },
      [input, onSend],
    );

    return (
      <div ref={ref} className={cn('flex h-full flex-col', className)} {...props}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-2">
          {messages.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Ask the copilot about entities, connections, or investigations.
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn('rounded-md px-3 py-2 text-sm', ROLE_STYLES[msg.role])}>
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the copilot..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Send
          </button>
        </form>
      </div>
    );
  },
);
CopilotChat.displayName = 'CopilotChat';

export { CopilotChat };
